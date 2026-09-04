import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cards = [
  {
    sequence: '01',
    id: 'CC-241202',
    slug: 'the-monday-scorecard',
    title: ['The Monday', 'Scorecard'],
    unit: 'CUSTOMER CARE',
    role: 'CUSTOMER INSIGHTS ANALYST',
    band: 'BRIEF',
    accent: '#e2764d',
    plot: 'M808 720 L854 676 L900 698 L946 626 L992 651 L1038 580 L1084 600 L1130 546',
  },
  {
    sequence: '02',
    id: 'CM-240708',
    slug: 'the-quarter-that-moved',
    title: ['The Quarter', 'That Moved'],
    unit: 'COMMERCIAL DATA TRANSITION',
    role: 'COMMERCIAL DATA TRANSITION ANALYST',
    band: 'INVESTIGATION',
    accent: '#d69b45',
    plot: 'M808 705 L854 704 L900 650 L946 681 L992 604 L1038 618 L1084 557 L1130 571',
  },
  {
    sequence: '03',
    id: 'GX-250505',
    slug: 'the-navigation-vote',
    title: ['The Navigation', 'Vote'],
    unit: 'PRODUCT EXPERIMENTATION',
    role: 'PRODUCT EXPERIMENTATION ANALYST',
    band: 'DECISION',
    accent: '#4f9a91',
    plot: 'M808 692 C850 628 886 746 930 667 S1011 603 1050 649 S1102 588 1130 528',
  },
  {
    sequence: '04',
    id: 'OP-250320',
    slug: 'rollback-before-dawn',
    title: ['Rollback Before', 'Dawn'],
    unit: 'CONNECTED RELIABILITY',
    role: 'CONNECTED RELIABILITY ANALYST',
    band: 'DECISION',
    accent: '#d45d58',
    plot: 'M808 561 L854 574 L900 555 L946 637 L992 606 L1038 700 L1084 682 L1130 748',
  },
  {
    sequence: '05',
    id: 'FO-250320',
    slug: 'the-730-capacity-call',
    title: ['The 7:30', 'Capacity Call'],
    unit: 'FIELD OPERATIONS PLANNING',
    role: 'SERVICE CAPACITY ANALYST',
    band: 'DECISION',
    accent: '#598ab5',
    plot: 'M808 714 L854 662 L900 670 L946 612 L992 620 L1038 573 L1084 595 L1130 542',
  },
  {
    sequence: '06',
    id: 'SP-251201',
    slug: 'forty-eight-hours-of-stock',
    title: ['Forty-Eight Hours', 'of Stock'],
    unit: 'SUPPLY PLANNING',
    role: 'SUPPLY PLANNING DATA SCIENTIST',
    band: 'PRACTICUM',
    accent: '#8da35e',
    plot: 'M808 570 L842 590 L876 610 L910 653 L944 643 L978 692 L1012 677 L1046 730 L1080 711 L1130 758',
  },
  {
    sequence: '07',
    id: 'PR-260119',
    slug: 'the-orion-renewal',
    title: ['The Orion', 'Renewal'],
    unit: 'FIELD OPERATIONS STRATEGY',
    role: 'SENIOR OPERATIONS ANALYST',
    band: 'DECISION',
    accent: '#7975ad',
    plot: 'M808 704 C856 704 858 582 906 582 S958 676 1006 676 S1052 548 1100 548 L1130 566',
  },
  {
    sequence: '08',
    id: 'NL-241203',
    slug: 'the-queue-nobody-owns',
    title: ['The Queue', 'Nobody Owns'],
    unit: 'SUPPORT OPERATIONS',
    role: 'APPLIED ML ANALYST',
    band: 'PRACTICUM',
    accent: '#9b6bab',
    plot: 'M808 681 L846 620 L884 695 L922 602 L960 671 L998 570 L1036 646 L1074 544 L1130 614',
  },
  {
    sequence: '09',
    id: 'MR-260120',
    slug: 'too-good-to-ship',
    title: ['Too Good', 'to Ship'],
    unit: 'ML GOVERNANCE',
    role: 'MODEL RISK ANALYST',
    band: 'PRACTICUM',
    accent: '#ad6878',
    plot: 'M808 743 L854 739 L900 732 L946 718 L992 680 L1038 606 L1084 487 L1130 391',
  },
];

const outputDirectory = path.resolve('public/social/assignments');

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function cardSvg(card) {
  const [lineOne, lineTwo] = card.title.map(escapeXml);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect y="285" width="1200" height="630" fill="#112129"/>
  <rect y="285" width="1200" height="8" fill="${card.accent}"/>
  <path d="M760 293V915" stroke="#344851"/>
  <path d="M72 382H688" stroke="#344851"/>
  <path d="M72 805H688" stroke="#344851"/>
  <g opacity=".35" stroke="#52666e">
    <path d="M800 500H1152M800 550H1152M800 600H1152M800 650H1152M800 700H1152M800 750H1152"/>
    <path d="M820 480V770M870 480V770M920 480V770M970 480V770M1020 480V770M1070 480V770M1120 480V770"/>
  </g>
  <path d="${card.plot}" fill="none" stroke="${card.accent}" stroke-width="6" stroke-linecap="square" stroke-linejoin="miter"/>
  <text x="72" y="348" fill="#e4eae8" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="4">THE ANALYST</text>
  <text x="688" y="348" fill="#768a90" font-family="Menlo, monospace" font-size="11" text-anchor="end" letter-spacing="2">MERIDIAN WORK ASSIGNMENT</text>
  <text x="72" y="438" fill="${card.accent}" font-family="Menlo, monospace" font-size="13" font-weight="700" letter-spacing="2">${card.unit} / ${card.id}</text>
  <text x="72" y="530" fill="#f0f3f1" font-family="Arial, sans-serif" font-size="66" font-weight="700" letter-spacing="-3">${lineOne}</text>
  <text x="72" y="598" fill="#f0f3f1" font-family="Arial, sans-serif" font-size="66" font-weight="700" letter-spacing="-3">${lineTwo}</text>
  <text x="72" y="660" fill="#a8b7ba" font-family="Menlo, monospace" font-size="13" letter-spacing="2">YOUR ROLE / ${card.role}</text>
  <text x="72" y="852" fill="#8a9b9f" font-family="Menlo, monospace" font-size="12" letter-spacing="2">ACCEPT THE BRIEF</text>
  <text x="688" y="852" fill="#e2e9e7" font-family="Menlo, monospace" font-size="12" text-anchor="end" letter-spacing="1">THEANALYST.DEV/ASSIGNMENTS/${card.slug.toUpperCase()}</text>
  <text x="800" y="378" fill="${card.accent}" font-family="Menlo, monospace" font-size="12" font-weight="700" letter-spacing="3">ASSIGNMENT ${card.sequence}</text>
  <text x="1144" y="444" fill="#edf1ef" font-family="Arial, sans-serif" font-size="112" font-weight="700" text-anchor="end" letter-spacing="-6">${card.sequence}</text>
  <text x="800" y="828" fill="#768a90" font-family="Menlo, monospace" font-size="11" letter-spacing="2">COMPLEXITY BAND</text>
  <text x="1144" y="862" fill="#e4eae8" font-family="Menlo, monospace" font-size="16" font-weight="700" text-anchor="end" letter-spacing="2">${card.band}</text>
</svg>\n`;
}

await mkdir(outputDirectory, { recursive: true });
for (const card of cards) {
  await writeFile(
    path.join(outputDirectory, `${card.slug}.svg`),
    cardSvg(card),
    'utf8',
  );
}

console.log(`Generated ${cards.length} assignment social-card SVG sources.`);
