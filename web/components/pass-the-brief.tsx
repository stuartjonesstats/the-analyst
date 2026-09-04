'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Mail,
  Send,
  Share2,
} from 'lucide-react';

import { assignmentUrl } from '@/lib/assignment-publication';
import { trackPublicEvent } from '@/lib/analytics';

import styles from './pass-the-brief.module.css';

type ShareChannel =
  | 'linkedin'
  | 'native'
  | 'copy'
  | 'email'
  | 'bluesky'
  | 'x'
  | 'facebook';

type PassTheBriefProps = {
  assignmentId: string;
  slug: string;
  title: string;
  role: string;
  caption: string;
};

function trackedUrl(slug: string, source: ShareChannel) {
  const url = new URL(assignmentUrl(slug));
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', source === 'email' ? 'email' : 'share');
  url.searchParams.set('utm_campaign', 'pass_the_brief');
  url.searchParams.set('utm_content', slug);
  return url.toString();
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  window.prompt('Copy this text:', text);
  return false;
}

function openShareWindow(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function PassTheBrief({
  assignmentId,
  slug,
  title,
  role,
  caption,
}: PassTheBriefProps) {
  const [feedback, setFeedback] = useState('');

  function announce(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 3000);
  }

  function trackShare(method: ShareChannel) {
    trackPublicEvent('share_intent_opened', {
      content_kind: 'assignment',
      content_id: assignmentId,
      method,
    });
  }

  async function handleNativeShare() {
    if (typeof navigator.share !== 'function') {
      const copied = await copyText(trackedUrl(slug, 'copy'));
      announce(
        copied ? 'Challenge link copied.' : 'Challenge link ready to copy.',
      );
      return;
    }
    try {
      trackShare('native');
      await navigator.share({
        title: `${title} — The Analyst`,
        text: caption,
        url: trackedUrl(slug, 'native'),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const copied = await copyText(trackedUrl(slug, 'copy'));
      announce(
        copied ? 'Share link copied instead.' : 'Share link ready to copy.',
      );
    }
  }

  async function handleCopyLink() {
    const copied = await copyText(trackedUrl(slug, 'copy'));
    trackPublicEvent('share_link_copied', { content_kind: 'assignment', content_id: assignmentId });
    announce(
      copied ? 'Challenge link copied.' : 'Challenge link ready to copy.',
    );
  }

  async function handleCopyCaption() {
    const copied = await copyText(`${caption}\n\n${assignmentUrl(slug)}`);
    trackPublicEvent('share_caption_copied', { content_kind: 'assignment', content_id: assignmentId });
    announce(copied ? 'Suggested caption copied.' : 'Caption ready to copy.');
  }

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(trackedUrl(slug, 'linkedin'))}`;
  const emailSubject = `Your next analyst assignment: ${title}`;
  const emailBody = `${caption}\n\nRole: ${role}\nAssignment: ${assignmentId}\n\nAccept the brief: ${trackedUrl(slug, 'email')}`;
  const secondaryShares = [
    {
      label: 'BLUESKY',
      url: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${caption}\n\n${trackedUrl(slug, 'bluesky')}`)}`,
    },
    {
      label: 'X',
      url: `https://x.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(trackedUrl(slug, 'x'))}`,
    },
    {
      label: 'FACEBOOK',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackedUrl(slug, 'facebook'))}`,
    },
  ];

  return (
    <section className={styles.panel} aria-labelledby="pass-the-brief-title">
      <header className={styles.heading}>
        <span>FORWARDING DESK / OPTIONAL</span>
        <Share2 aria-hidden="true" />
      </header>
      <div className={styles.intro}>
        <p className={styles.kicker}>CHALLENGE A COLLEAGUE</p>
        <h2 id="pass-the-brief-title">Pass the Brief</h2>
        <p>
          Send the same decision pressure to someone else. The link opens this
          spoiler-free briefing; it does not include your work, identity, or
          progress.
        </p>
      </div>
      <blockquote className={styles.caption}>
        <span>SUGGESTED NOTE</span>
        <p>{caption}</p>
        <button type="button" onClick={handleCopyCaption}>
          <Copy aria-hidden="true" /> COPY NOTE
        </button>
      </blockquote>
      <div className={styles.primaryActions}>
        <button
          type="button"
          className={styles.linkedin}
          onClick={() => { trackShare('linkedin'); openShareWindow(linkedInUrl); }}
        >
          <span aria-hidden="true" className={styles.linkedinMark}>
            in
          </span>
          SHARE ON LINKEDIN
          <ExternalLink aria-hidden="true" />
        </button>
        <button type="button" onClick={handleNativeShare}>
          <Send aria-hidden="true" /> SHARE…
        </button>
        <button type="button" onClick={handleCopyLink}>
          <LinkIcon aria-hidden="true" /> COPY LINK
        </button>
        <a
          href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
          onClick={() => trackShare('email')}
        >
          <Mail aria-hidden="true" /> EMAIL
        </a>
      </div>
      <details className={styles.moreShares}>
        <summary>MORE WAYS TO PASS THE BRIEF</summary>
        <div>
          {secondaryShares.map((share) => (
            <button
              key={share.label}
              type="button"
              onClick={() => { trackShare(share.label.toLowerCase() as ShareChannel); openShareWindow(share.url); }}
            >
              {share.label} <ExternalLink aria-hidden="true" />
            </button>
          ))}
        </div>
      </details>
      <p className={styles.status} aria-live="polite" aria-atomic="true">
        {feedback && (
          <>
            <Check aria-hidden="true" /> {feedback}
          </>
        )}
      </p>
    </section>
  );
}
