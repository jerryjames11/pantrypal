import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Privacy.module.css'

export default function Privacy() {
  const [form, setForm] = useState({ name: '', email: '', request_type: 'access', message: '' })
  const [status, setStatus] = useState(null) // 'sending' | 'success' | 'error'

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/privacy-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStatus('success')
      setForm({ name: '', email: '', request_type: 'access', message: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <Head>
        <title>Privacy Policy · PantryPal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.backRow}>
            <Link href="/" className={styles.backBtn}>← Back to PantryPal</Link>
          </div>

          <div className={styles.header}>
            <img src="/logo.png" alt="PantryPal" className={styles.logo} />
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.updated}>Last updated: June 13, 2026</p>
          </div>

          <div className={styles.section}>
            <h2>1. Introduction</h2>
            <p>PantryPal ("we", "us", or "our") is committed to protecting your personal data and respecting your privacy rights. This Privacy Policy explains how we collect, use, store, and share your information when you use PantryPal, and describes your rights under applicable privacy laws including GDPR (EU/UK), CCPA (California), PIPEDA (Canada), LGPD (Brazil), PDPA (Thailand/Singapore), POPIA (South Africa), and the Australian Privacy Act.</p>
          </div>

          <div className={styles.section}>
            <h2>2. Data We Collect</h2>
            <h3>Account Information</h3>
            <p>When you sign in with Google, we receive your name, email address, and profile picture via Google OAuth. We do not receive or store your Google password.</p>
            <h3>Pantry & Grocery Data</h3>
            <p>We store the pantry items, categories, quantities, statuses, prices, and purchase dates you enter. We also store your shopping cart items and saved recipes.</p>
            <h3>Receipt Data</h3>
            <p>When you scan a receipt, the image or text is sent to our AI provider (OpenRouter) for parsing. We store the resulting item names, quantities, and prices. We do not permanently store receipt images.</p>
            <h3>Usage Data</h3>
            <p>Our hosting provider (Vercel) and database provider (Supabase) may automatically log IP addresses, browser type, and request timestamps for security and operational purposes.</p>
          </div>

          <div className={styles.section}>
            <h2>3. Legal Basis for Processing (GDPR)</h2>
            <p>We process your data under the following legal bases:</p>
            <ul>
              <li><strong>Contract performance</strong> — to provide the PantryPal service you signed up for</li>
              <li><strong>Legitimate interests</strong> — to maintain security, prevent fraud, and improve the service</li>
              <li><strong>Consent</strong> — for any optional features or communications you opt into</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2>4. How We Use Your Data</h2>
            <ul>
              <li>To provide, maintain, and improve PantryPal</li>
              <li>To process receipts and generate recipe suggestions using AI</li>
              <li>To sync your pantry data across devices</li>
              <li>To respond to your privacy requests and support queries</li>
            </ul>
            <p>We do <strong>not</strong> sell your data, use it for advertising, or share it with third parties beyond those listed in Section 5.</p>
          </div>

          <div className={styles.section}>
            <h2>5. Third Parties</h2>
            <table className={styles.table}>
              <thead>
                <tr><th>Provider</th><th>Purpose</th><th>Location</th><th>Privacy Policy</th></tr>
              </thead>
              <tbody>
                <tr><td>Supabase</td><td>Database & authentication</td><td>US (East)</td><td><a href="https://supabase.com/privacy" target="_blank" rel="noopener">supabase.com/privacy</a></td></tr>
                <tr><td>Vercel</td><td>App hosting</td><td>US / Global CDN</td><td><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener">vercel.com/legal/privacy-policy</a></td></tr>
                <tr><td>OpenRouter</td><td>AI receipt parsing & recipes</td><td>US</td><td><a href="https://openrouter.ai/privacy" target="_blank" rel="noopener">openrouter.ai/privacy</a></td></tr>
                <tr><td>Google</td><td>Sign-in authentication</td><td>US / Global</td><td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a></td></tr>
              </tbody>
            </table>
            <p>Your receipt content (text or image) is transmitted to OpenRouter for AI processing. This data is processed transiently and is not retained by OpenRouter beyond the request. Please avoid scanning receipts containing sensitive personal or financial information beyond standard grocery items.</p>
          </div>

          <div className={styles.section}>
            <h2>6. Data Storage & International Transfers</h2>
            <p>Your data is stored on Supabase servers located in the <strong>United States (us-east-1)</strong>. If you are located outside the United States, your data will be transferred internationally. We rely on standard contractual clauses and our providers' compliance frameworks (including GDPR adequacy mechanisms) for lawful international data transfers.</p>
          </div>

          <div className={styles.section}>
            <h2>7. Data Retention</h2>
            <ul>
              <li><strong>Account data</strong> — retained until you delete your account</li>
              <li><strong>Pantry & receipt data</strong> — retained until you delete items or your account</li>
              <li><strong>Receipt images</strong> — not stored; processed in real time only</li>
              <li><strong>Server logs</strong> — retained for up to 30 days by Vercel and Supabase for security purposes</li>
              <li><strong>Privacy requests</strong> — retained for 3 years for compliance records</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2>8. Your Rights</h2>
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul>
              <li><strong>Access</strong> — request a copy of your data</li>
              <li><strong>Correction</strong> — request correction of inaccurate data</li>
              <li><strong>Deletion</strong> — request deletion of your account and all associated data</li>
              <li><strong>Portability</strong> — request your data in a portable format</li>
              <li><strong>Objection</strong> — object to certain types of processing</li>
              <li><strong>Restriction</strong> — request we limit processing of your data</li>
              <li><strong>Withdrawal of consent</strong> — where processing is based on consent</li>
            </ul>
            <p>California residents have additional rights under CCPA including the right to know, delete, and opt-out of sale (we do not sell data). Brazilian residents have rights under LGPD. EU/UK residents have rights under GDPR and may lodge complaints with their local supervisory authority.</p>
            <p>To exercise any of these rights, use the contact form below.</p>
          </div>

          <div className={styles.section}>
            <h2>9. Security</h2>
            <p>We implement appropriate technical and organisational measures to protect your data, including:</p>
            <ul>
              <li>Row-level security in Supabase — you can only access your own data</li>
              <li>All data transmitted over HTTPS/TLS encryption</li>
              <li>Authentication handled by Google OAuth — we never store passwords</li>
              <li>Regular security reviews of our infrastructure</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2>10. Children's Privacy</h2>
            <p>PantryPal is not directed at children under the age of 13 (or 16 in the EU). We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us using the form below and we will delete it promptly.</p>
          </div>

          <div className={styles.section}>
            <h2>11. Cookies & Local Storage</h2>
            <p>PantryPal uses cookies and browser local storage solely for authentication session management via Supabase. We do not use advertising cookies, tracking pixels, or third-party analytics. No cookie consent banner is required as we only use strictly necessary cookies.</p>
          </div>

          <div className={styles.section}>
            <h2>12. AI Processing Disclosure</h2>
            <p>When you scan a receipt or request recipe suggestions, your grocery data is sent to OpenRouter's AI service for processing. This is necessary to provide the core features of PantryPal. The data sent includes item names, quantities, and prices from your receipts. We recommend you do not include receipts containing medical purchases, prescription details, or other sensitive personal information.</p>
          </div>

          <div className={styles.section}>
            <h2>13. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by displaying a notice in the app. Your continued use of PantryPal after changes take effect constitutes acceptance of the updated policy. We encourage you to review this page periodically.</p>
          </div>

          <div className={styles.section} id="contact">
            <h2>14. Contact & Privacy Requests</h2>
            <p>To exercise your privacy rights, request data deletion, ask questions about this policy, or report a privacy concern, please complete the form below. We will respond within <strong>30 days</strong> (or within the timeframe required by your local law).</p>

            {status === 'success' ? (
              <div className={styles.successBox}>
                ✓ Your request has been received. We will respond within 30 days.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Full name *</label>
                  <input type="text" required className={styles.formInput}
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your name" />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Email address *</label>
                  <input type="email" required className={styles.formInput}
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="your@email.com" />
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Request type *</label>
                  <select required className={styles.formInput}
                    value={form.request_type} onChange={e => setForm(f => ({ ...f, request_type: e.target.value }))}>
                    <option value="access">Access my data</option>
                    <option value="delete">Delete my account & data</option>
                    <option value="correct">Correct my data</option>
                    <option value="export">Export my data</option>
                    <option value="other">Other privacy question</option>
                  </select>
                </div>
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Details *</label>
                  <textarea required className={styles.formTextarea} rows={4}
                    value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Please describe your request in detail…" />
                </div>
                {status === 'error' && (
                  <div className={styles.errorBox}>Something went wrong. Please try again.</div>
                )}
                <button type="submit" className={styles.submitBtn} disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Submit privacy request'}
                </button>
              </form>
            )}
          </div>

          <div className={styles.footer}>
            <p>© {new Date().getFullYear()} PantryPal. All rights reserved.</p>
            <Link href="/" className={styles.backBtn}>← Back to PantryPal</Link>
          </div>
        </div>
      </div>
    </>
  )
}
