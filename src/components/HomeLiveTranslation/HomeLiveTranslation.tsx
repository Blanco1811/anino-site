'use client';

import React, { useEffect, useRef } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '@/i18n/client';
import { translateBatchWithServerApi } from '@/lib/browserTranslation';

const homeI18n = i18n.cloneInstance({ lng: 'en', fallbackLng: 'en' });
const originalTextMap = new WeakMap<Text, string>();
const originalAttributeMap = new WeakMap<Element, Map<string, string>>();
const ATTRIBUTE_NAMES = ['placeholder', 'title', 'aria-label'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG']);
const LOCAL_TRANSLATION_CACHE = new Map<string, string>();

type TextEntry = {
  kind: 'text';
  node: Text;
  original: string;
};

type AttributeEntry = {
  kind: 'attribute';
  element: HTMLElement;
  attributeName: string;
  original: string;
};

type Entry = TextEntry | AttributeEntry;

function normalizeLanguage(language?: string): string {
  if (!language || typeof language !== 'string') return 'en';
  return language.split('-')[0].toLowerCase();
}

function isTranslatableText(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^https?:\/\/\S+$/i.test(trimmed)) return false;
  if (!/[A-Za-z\u00C0-\u024F\u0400-\u04FF\u0590-\u05FF]/.test(trimmed)) return false;
  return true;
}

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return true;
  if (SKIP_TAGS.has(element.tagName)) return true;
  if (element.closest('[data-no-live-translate="true"]')) return true;
  return false;
}

function collectEntries(root: HTMLElement): Entry[] {
  const entries: Entry[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parentElement = node.parentElement;
      if (!parentElement || shouldSkipElement(parentElement)) {
        return NodeFilter.FILTER_REJECT;
      }

      const text = node.nodeValue ?? '';
      if (!isTranslatableText(text)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    const textNode = currentNode as Text;
    const original = originalTextMap.get(textNode) ?? textNode.nodeValue ?? '';
    originalTextMap.set(textNode, original);
    entries.push({ kind: 'text', node: textNode, original });
    currentNode = walker.nextNode();
  }

  const elements = root.querySelectorAll<HTMLElement>('*');
  elements.forEach((element) => {
    if (shouldSkipElement(element)) return;

    ATTRIBUTE_NAMES.forEach((attributeName) => {
      const value = element.getAttribute(attributeName);
      if (!value || !isTranslatableText(value)) return;

      const existingAttributes = originalAttributeMap.get(element) ?? new Map<string, string>();
      if (!existingAttributes.has(attributeName)) {
        existingAttributes.set(attributeName, value);
        originalAttributeMap.set(element, existingAttributes);
      }

      entries.push({
        kind: 'attribute',
        element,
        attributeName,
        original: existingAttributes.get(attributeName) ?? value,
      });
    });
  });

  return entries;
}

function applyOriginalValues(entries: Entry[]) {
  entries.forEach((entry) => {
    if (entry.kind === 'text') {
      if (entry.node.isConnected) {
        entry.node.nodeValue = entry.original;
      }
      return;
    }

    if (entry.element.isConnected) {
      entry.element.setAttribute(entry.attributeName, entry.original);
    }
  });
}

async function translateEntries(entries: Entry[], targetLanguage: string) {
  const uniqueTexts = Array.from(
    new Set(entries.map((entry) => entry.original).filter((text) => isTranslatableText(text)))
  );

  if (!uniqueTexts.length) {
    return;
  }

  const uncachedTexts = uniqueTexts.filter((text) => !LOCAL_TRANSLATION_CACHE.has(`${targetLanguage}|${text}`));
  const batchSize = 50;

  for (let index = 0; index < uncachedTexts.length; index += batchSize) {
    const batch = uncachedTexts.slice(index, index + batchSize);
    const translated = await translateBatchWithServerApi(batch, targetLanguage, 'he');
    batch.forEach((text, batchIndex) => {
      LOCAL_TRANSLATION_CACHE.set(`${targetLanguage}|${text}`, translated[batchIndex] || text);
    });
  }

  entries.forEach((entry) => {
    const translatedValue = LOCAL_TRANSLATION_CACHE.get(`${targetLanguage}|${entry.original}`) || entry.original;

    if (entry.kind === 'text') {
      if (entry.node.isConnected) {
        entry.node.nodeValue = translatedValue;
      }
      return;
    }

    if (entry.element.isConnected) {
      entry.element.setAttribute(entry.attributeName, translatedValue);
    }
  });
}

interface HomeLiveTranslationProps {
  children: React.ReactNode;
}

const HomeLiveTranslation: React.FC<HomeLiveTranslationProps> = ({ children }) => {
  const { i18n: appI18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const targetLanguage = normalizeLanguage(appI18n.language);

  useEffect(() => {
    homeI18n.changeLanguage('en');
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let requestVersion = 0;

    const runTranslation = async () => {
      const currentVersion = ++requestVersion;
      const entries = collectEntries(container);

      if (targetLanguage === 'he') {
        applyOriginalValues(entries);
        return;
      }

      applyOriginalValues(entries);
      await translateEntries(entries, targetLanguage);

      if (cancelled || currentVersion !== requestVersion) {
        applyOriginalValues(entries);
      }
    };

    const scheduleTranslation = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        void runTranslation();
      }, 120);
    };

    const observer = new MutationObserver(() => {
      scheduleTranslation();
    });

    observer.observe(container, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTE_NAMES],
    });

    scheduleTranslation();

    return () => {
      cancelled = true;
      observer.disconnect();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [targetLanguage]);

  return (
    <I18nextProvider i18n={homeI18n}>
      <div ref={containerRef}>
        {children}
      </div>
    </I18nextProvider>
  );
};

export default HomeLiveTranslation;
