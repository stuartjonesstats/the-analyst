'use client';

import { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Link as LinkIcon, Mail, Send, Share2 } from 'lucide-react';

import { trackPublicEvent } from '@/lib/analytics';
import { sitePath } from '@/lib/site-path';

import styles from './priority-briefs.module.css';

type PriorityBriefShareProps = {
  id: string;
  slug: string;
  title: string;
  role: string;
  caption: string;
  socialImage: string;
};

type ShareSource = 'linkedin' | 'native' | 'copy' | 'email' | 'bluesky' | 'x' | 'facebook';

function briefUrl(slug: string, source?: ShareSource) {
  const origin = typeof window === 'undefined' ? 'https://theanalyst.dev' : window.location.origin;
  const url = new URL(sitePath(`/briefs/${slug}/`), origin);
  if (source) {
    url.searchParams.set('utm_source', source);
    url.searchParams.set('utm_medium', source === 'email' ? 'email' : 'share');
    url.searchParams.set('utm_campaign', 'priority_brief');
    url.searchParams.set('utm_content', slug);
  }
  return url.toString();
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  window.prompt('Copy this text:', value);
  return false;
}

export function PriorityBriefShare({ id, slug, title, role, caption, socialImage }: PriorityBriefShareProps) {
  const [feedback, setFeedback] = useState('');

  function announce(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 3000);
  }

  function trackShare(method: ShareSource) {
    trackPublicEvent('share_intent_opened', { content_kind: 'priority_brief', content_id: id, method });
  }

  async function copyLink() {
    const copied = await copyText(briefUrl(slug, 'copy'));
    trackPublicEvent('share_link_copied', { content_kind: 'priority_brief', content_id: id });
    announce(copied ? 'Challenge link copied.' : 'Challenge link ready to copy.');
  }

  async function copyCaption() {
    const copied = await copyText(`${caption}\n\n${briefUrl(slug)}`);
    trackPublicEvent('share_caption_copied', { content_kind: 'priority_brief', content_id: id });
    announce(copied ? 'Suggested note copied.' : 'Suggested note ready to copy.');
  }

  async function nativeShare() {
    if (typeof navigator.share !== 'function') {
      await copyLink();
      return;
    }
    try {
      trackShare('native');
      await navigator.share({ title: `${title} — The Analyst`, text: caption, url: briefUrl(slug, 'native') });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await copyLink();
    }
  }

  const emailSubject = `Priority Brief for you: ${title}`;
  const emailLink = `https://theanalyst.dev/briefs/${slug}/?utm_source=email&utm_medium=email&utm_campaign=priority_brief&utm_content=${slug}`;
  const emailBody = `${caption}\n\nRole: ${role}\nBrief: ${id}\n\nAccept the brief: ${emailLink}`;
  const secondaryShares = [
    { label: 'BLUESKY', source: 'bluesky' as const, url: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${caption}\n\n${briefUrl(slug, 'bluesky')}`)}` },
    { label: 'X', source: 'x' as const, url: `https://x.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(briefUrl(slug, 'x'))}` },
    { label: 'FACEBOOK', source: 'facebook' as const, url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(briefUrl(slug, 'facebook'))}` },
  ];

  return (
    <section className={styles.sharePanel} aria-labelledby="priority-share-title">
      <header>
        <span>FORWARDING DESK / OPTIONAL</span>
        <Share2 aria-hidden="true" />
      </header>
      <div className={styles.shareIntro}>
        <p>CHALLENGE A COLLEAGUE</p>
        <h2 id="priority-share-title">Pass the Brief</h2>
        <span>The link shares this spoiler-free briefing. It never includes your work, identity, or browser progress.</span>
      </div>
      <blockquote className={styles.shareCaption}>
        <span>SUGGESTED NOTE</span>
        <p>{caption}</p>
        <button type="button" onClick={copyCaption}><Copy aria-hidden="true" /> COPY NOTE</button>
      </blockquote>
      <div className={styles.shareActions}>
        <button
          type="button"
          className={styles.linkedinAction}
          onClick={() => { trackShare('linkedin'); window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(briefUrl(slug, 'linkedin'))}`, '_blank', 'noopener,noreferrer'); }}
        >
          <b aria-hidden="true">in</b> LINKEDIN <ExternalLink aria-hidden="true" />
        </button>
        <button type="button" onClick={nativeShare}><Send aria-hidden="true" /> SHARE…</button>
        <button type="button" onClick={copyLink}><LinkIcon aria-hidden="true" /> COPY LINK</button>
        <a href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`} onClick={() => trackShare('email')}><Mail aria-hidden="true" /> EMAIL</a>
        <a href={sitePath(socialImage)} download={`${slug}-priority-brief.png`} onClick={() => trackPublicEvent('share_card_downloaded', { content_kind: 'priority_brief', content_id: id })}><Download aria-hidden="true" /> DOWNLOAD CARD</a>
        {secondaryShares.map((share) => <button key={share.source} type="button" onClick={() => { trackShare(share.source); window.open(share.url, '_blank', 'noopener,noreferrer'); }}>{share.label} <ExternalLink aria-hidden="true" /></button>)}
      </div>
      <p className={styles.shareFeedback} aria-live="polite">{feedback && <><Check aria-hidden="true" /> {feedback}</>}</p>
    </section>
  );
}
