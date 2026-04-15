/**
 * Database Seed Script
 *
 * Populates the database with a default agent account and sample tickets
 * for development and demo purposes. Run with: npm run seed
 *
 * Creates:
 * - 1 default agent account (agent@smarttriage.com / password123)
 * - 10 sample tickets spanning different categories and priorities
 *
 * The script is idempotent — running it multiple times won't create
 * duplicate agents (the email unique index prevents it). Tickets are
 * always created fresh since they don't have a unique constraint.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { AgentModel } from '../src/models/Agent';
import { TicketModel } from '../src/models/Ticket';

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const DEFAULT_AGENT = {
  email: 'agent@smarttriage.com',
  password: 'password123',
  name: 'Demo Agent',
  role: 'agent' as const,
};

const SAMPLE_TICKETS = [
  {
    title: 'Payment failed but I was charged twice',
    description: 'I tried to upgrade my plan yesterday and the payment page showed an error. But my credit card was charged $49.99 twice. I need a refund for both charges since my plan was not actually upgraded.',
    customerEmail: 'sarah@example.com',
    status: 'open' as const,
    priority: 'high' as const,
    category: 'billing' as const,
    aiConfidence: 0.95,
    aiClassificationFailed: false,
  },
  {
    title: 'App crashes when uploading files larger than 10MB',
    description: 'Every time I try to upload a PDF larger than 10MB, the app freezes for about 30 seconds and then shows a white screen. I have to reload the page. This started happening after last week\'s update.',
    customerEmail: 'mike@example.com',
    status: 'in_progress' as const,
    priority: 'medium' as const,
    category: 'bug' as const,
    aiConfidence: 0.92,
    aiClassificationFailed: false,
  },
  {
    title: 'Can you add dark mode?',
    description: 'I use the dashboard late at night and the white background is really harsh on my eyes. It would be awesome to have a dark mode option in the settings.',
    customerEmail: 'emma@example.com',
    status: 'open' as const,
    priority: 'low' as const,
    category: 'feature_request' as const,
    aiConfidence: 0.98,
    aiClassificationFailed: false,
  },
  {
    title: 'Cannot login to my account',
    description: 'I forgot my password and tried to reset it, but the reset email never arrives. I\'ve checked my spam folder. My account email is john@example.com.',
    customerEmail: 'john@example.com',
    status: 'open' as const,
    priority: 'high' as const,
    category: 'account' as const,
    aiConfidence: 0.88,
    aiClassificationFailed: false,
  },
  {
    title: 'How do I set up the API integration?',
    description: 'We just signed up for the enterprise plan and I\'m trying to integrate your API with our CRM. The docs mention a webhook setup but I can\'t find where to configure it.',
    customerEmail: 'tech@company.com',
    status: 'open' as const,
    priority: 'medium' as const,
    category: 'technical_support' as const,
    aiConfidence: 0.90,
    aiClassificationFailed: false,
  },
  {
    title: 'URGENT: All data is gone after update',
    description: 'After the latest update, all our project data has disappeared. This is critical — we have 50+ team members who cannot work right now. Please help immediately.',
    customerEmail: 'cto@startup.com',
    status: 'in_progress' as const,
    priority: 'critical' as const,
    category: 'bug' as const,
    aiConfidence: 0.96,
    aiClassificationFailed: false,
  },
  {
    title: 'Invoice shows wrong amount',
    description: 'My monthly invoice for March shows $99 but I\'m on the $49/month plan. This has been happening for the last two months.',
    customerEmail: 'accounting@corp.com',
    status: 'open' as const,
    priority: 'high' as const,
    category: 'billing' as const,
    aiConfidence: 0.93,
    aiClassificationFailed: false,
  },
  {
    title: 'Export feature not working',
    description: 'When I try to export my data as CSV, the download starts but the file is always empty (0 bytes). This worked fine last week.',
    customerEmail: 'analyst@data.com',
    status: 'resolved' as const,
    priority: 'medium' as const,
    category: 'bug' as const,
    aiConfidence: 0.87,
    aiClassificationFailed: false,
  },
  {
    title: 'Great product, just a suggestion',
    description: 'Love the product! Just wanted to suggest adding keyboard shortcuts for the most common actions. Would really speed up our workflow.',
    customerEmail: 'fan@example.com',
    status: 'closed' as const,
    priority: 'low' as const,
    category: 'feature_request' as const,
    aiConfidence: 0.91,
    aiClassificationFailed: false,
  },
  {
    title: 'Need help understanding pricing',
    description: 'I\'m trying to figure out which plan is right for our team of 15 people. The pricing page is a bit confusing. Can someone explain the difference between Pro and Enterprise?',
    customerEmail: 'buyer@prospect.com',
    status: 'open' as const,
    priority: 'low' as const,
    category: 'general' as const,
    aiConfidence: 0.72,
    aiClassificationFailed: false,
  },
];

// ---------------------------------------------------------------------------
// Seed Function
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  const mongoUri = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/smart_triage';

  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // --- Seed Agent ---
  try {
    const passwordHash = await bcrypt.hash(DEFAULT_AGENT.password, 12);
    await AgentModel.create({
      email: DEFAULT_AGENT.email,
      passwordHash,
      name: DEFAULT_AGENT.name,
      role: DEFAULT_AGENT.role,
    });
    console.log(`Created agent: ${DEFAULT_AGENT.email} (password: ${DEFAULT_AGENT.password})`);
  } catch (error) {
    // Duplicate key error means the agent already exists — that's fine.
    if ((error as Error & { code?: number }).code === 11000) {
      console.log(`Agent ${DEFAULT_AGENT.email} already exists, skipping.`);
    } else {
      throw error;
    }
  }

  // --- Seed Tickets ---
  const createdTickets = await TicketModel.insertMany(SAMPLE_TICKETS);
  console.log(`Created ${createdTickets.length} sample tickets.`);

  // --- Summary ---
  console.log('\n=== Seed Complete ===');
  console.log(`Agent login: ${DEFAULT_AGENT.email} / ${DEFAULT_AGENT.password}`);
  console.log(`Tickets created: ${createdTickets.length}`);
  console.log('====================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
