import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Camera, Check, Clipboard, Clock, FileText, Home, MessageCircle, Plus, Shield, Tool, X } from 'react-feather';
import { api } from '../api/client';

const money = value => `₦${Number(value || 0).toLocaleString('en-NG')}`;
const date = value => value ? new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'To be confirmed';
const issueNames = { move_in: 'Move-in condition', move_out: 'Move-out condition', maintenance: 'Maintenance', damage: 'Damage report' };
const emptyIssue = { kind: 'move_in', title: '', area: '', description: '', severity: 'normal', photos: [] };

function ImagePicker({ photos, onChange }) {
  const add = async event => {
    const files = Array.from(event.target.files || []).slice(0, 3 - photos.length);
    const next = [];
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
      const result = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => resolve(null); reader.readAsDataURL(file); });
      if (result) next.push(result);
    }
    onChange([...photos, ...next].slice(0, 3));
    event.target.value = '';
  };
  return <div className="exp-photo-picker"><label><Camera size={20} /><span>Add photos <small>Up to 3 · 2 MB each</small></span><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={add} disabled={photos.length >= 3} /></label>{photos.map((photo, i) => <div className="exp-photo-preview" key={i}><img src={photo} alt={`Evidence ${i + 1}`} /><button type="button" onClick={() => onChange(photos.filter((_, n) => n !== i))} aria-label={`Remove photo ${i + 1}`}><X size={14} /></button></div>)}</div>;
}

export default function StaySpace() {
  const { bookingId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('overview');
  const [agreementForm, setAgreementForm] = useState({ terms: '', houseRules: '', moveInInstructions: '' });
  const [issueForm, setIssueForm] = useState(emptyIssue);
  const [issueOpen, setIssueOpen] = useState(false);
  const [responses, setResponses] = useState({});
  const [replies, setReplies] = useState({});
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await api.get(`/api/stays/${bookingId}`);
      setData(result);
      if (result.agreement) setAgreementForm({ terms: result.agreement.terms, houseRules: result.agreement.houseRules || '', moveInInstructions: result.agreement.moveInInstructions || '' });
    } catch (err) { setError(err.status === 404 ? 'Stay tools are being set up for this booking. Please try again later.' : err.message); }
    finally { setLoading(false); }
  }, [bookingId]);
  useEffect(() => { load(); }, [load]);

  const act = async (job, success) => {
    setBusy(true); setError(''); setNotice('');
    try { await job(); await load(); setNotice(success); return true; }
    catch (err) { setError(err.message); return false; }
    finally { setBusy(false); }
  };
  const saveAgreement = event => { event.preventDefault(); act(() => api.put(`/api/stays/${bookingId}/agreement`, agreementForm), 'Agreement shared with your guest.'); };
  const acceptAgreement = () => act(() => api.post(`/api/stays/${bookingId}/agreement/accept`, { version: data.agreement.version }), 'Acknowledgement saved.');
  const createIssue = async event => { event.preventDefault(); if (await act(() => api.post(`/api/stays/${bookingId}/issues`, issueForm), 'Report added to this stay.')) { setIssueOpen(false); setIssueForm(emptyIssue); } };
  const updateIssue = (issue, status) => act(() => api.put(`/api/stays/${bookingId}/issues/${issue._id}`, { status, hostResponse: responses[issue._id] ?? issue.hostResponse ?? '' }), 'Report updated.');
  const replyToIssue = async issue => {
    const text = replies[issue._id]?.trim();
    if (!text) return;
    if (await act(() => api.post(`/api/stays/${bookingId}/issues/${issue._id}/updates`, { text }), 'Update added.')) setReplies(current => ({ ...current, [issue._id]: '' }));
  };

  if (loading && !data) return <div className="exp-stay-state">Opening your stay space…</div>;
  if (!data) return <div className="exp-stay-state"><AlertCircle size={35} /><h1>We couldn’t open this stay.</h1><p>{error}</p><Link to="/bookings">Back to stays</Link></div>;
  const { booking, agreement, issues, role } = data;
  const listing = booking.listingId || {};
  const image = typeof listing.images?.[0] === 'string' ? listing.images[0] : listing.images?.[0]?.large || listing.images?.[0]?.medium;

  return <div className="exp-stay"><div className="exp-stay-hero"><div className="exp-stay-hero-art">{image && <img src={image} alt={listing.name} />}</div><div className="exp-stay-hero-shade" /><div className="exp-stay-hero-content"><Link to="/bookings" className="exp-back"><ArrowLeft size={17} /> All stays</Link><span className="exp-kicker"><span /> THE STAY SPACE</span><h1>Feel at home.<br /><em>Stay in the know.</em></h1><p>{listing.name || 'Your property'} · {listing.location || 'Nigeria'}</p><div className="exp-stay-dates"><span>{date(booking.moveInDate)} → {date(booking.checkOutDate)}</span><span>{money(booking.totalAmount || booking.amount)} paid</span></div></div></div>
    <div className="exp-stay-main"><div className="exp-stay-tabs" role="tablist" aria-label="Stay space"><button role="tab" aria-selected={tab === 'overview'} className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><Home size={17} /> Overview</button><button role="tab" aria-selected={tab === 'agreement'} className={tab === 'agreement' ? 'active' : ''} onClick={() => setTab('agreement')}><FileText size={17} /> Agreement</button><button role="tab" aria-selected={tab === 'reports'} className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}><Tool size={17} /> Reports <span>{issues.length}</span></button></div>
      {error && <div className="exp-flash error"><AlertCircle size={17} />{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
      {notice && <div className="exp-flash"><Check size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={15} /></button></div>}
      {tab === 'overview' && <div className="exp-stay-overview"><div><span className="exp-overline">EVERYTHING TOGETHER</span><h2>Your stay,<br />under control.</h2><p>Keep the details, the conversation, and every report in one shared place.</p></div><div className="exp-overview-cards"><button onClick={() => setTab('agreement')}><FileText size={25} /><strong>Agreement</strong><span>{agreement ? agreement.status.replaceAll('_', ' ') : 'Waiting for host'}</span><ArrowRight size={18} /></button><button onClick={() => setTab('reports')}><Shield size={25} /><strong>Condition & requests</strong><span>{issues.length} {issues.length === 1 ? 'report' : 'reports'} on record</span><ArrowRight size={18} /></button><Link to="/conversations"><MessageCircle size={25} /><strong>Messages</strong><span>Talk with your {role === 'guest' ? 'host' : 'guest'}</span><ArrowRight size={18} /></Link><Link to={`/bookings/${bookingId}`}><Clipboard size={25} /><strong>Booking details</strong><span>Payment and dates</span><ArrowRight size={18} /></Link></div></div>}
      {tab === 'agreement' && <section className="exp-stay-section"><div className="exp-section-intro"><div><span className="exp-overline">THE SHARED RECORD</span><h2>Clear terms.<br />Good stays.</h2></div><p>The host sets out the stay terms. Both sides can acknowledge the same version, with a timestamp saved for each acknowledgement.</p></div>{role === 'host' && agreement?.status !== 'agreed' && <form className="exp-form-panel" onSubmit={saveAgreement}><h3>{agreement ? 'Edit agreement' : 'Prepare an agreement'}</h3><p>Use specific, agreed details. Editing resets earlier acknowledgements.</p><label>Stay terms<textarea value={agreementForm.terms} onChange={e => setAgreementForm({ ...agreementForm, terms: e.target.value })} minLength={30} maxLength={8000} required placeholder="Payment coverage, included utilities, access arrangements, responsibilities, and other agreed terms…" /></label><div className="exp-form-two"><label>House rules<textarea value={agreementForm.houseRules} onChange={e => setAgreementForm({ ...agreementForm, houseRules: e.target.value })} maxLength={3000} placeholder="Quiet hours, guests, shared areas…" /></label><label>Move-in instructions<textarea value={agreementForm.moveInInstructions} onChange={e => setAgreementForm({ ...agreementForm, moveInInstructions: e.target.value })} maxLength={2000} placeholder="Key handover, contact, arrival window…" /></label></div><button className="exp-action-primary" disabled={busy}>Share agreement <ArrowRight size={17} /></button></form>}
        {agreement ? <div className="exp-agreement"><div className="exp-agreement-head"><FileText size={23} /><div><strong>Stay agreement · version {agreement.version}</strong><span>{agreement.status.replaceAll('_', ' ')}</span></div></div><div className="exp-agreement-block"><small>TERMS</small><p>{agreement.terms}</p></div>{agreement.houseRules && <div className="exp-agreement-block"><small>HOUSE RULES</small><p>{agreement.houseRules}</p></div>}{agreement.moveInInstructions && <div className="exp-agreement-block"><small>MOVE-IN INSTRUCTIONS</small><p>{agreement.moveInInstructions}</p></div>}<div className="exp-agreement-signs"><div><Check size={17} /><span>Guest</span><strong>{agreement.guestAcceptedAt ? date(agreement.guestAcceptedAt) : 'Awaiting acknowledgement'}</strong></div><div><Check size={17} /><span>Host</span><strong>{agreement.hostAcceptedAt ? date(agreement.hostAcceptedAt) : 'Awaiting acknowledgement'}</strong></div></div>{agreement.history?.length > 0 && <details className="exp-revisions"><summary>Previous versions ({agreement.history.length})</summary>{agreement.history.slice().reverse().map(revision => <div key={revision.version}><strong>Version {revision.version}</strong><small>Replaced {date(revision.supersededAt)}</small><p>{revision.terms}</p>{revision.houseRules && <p><b>House rules:</b> {revision.houseRules}</p>}</div>)}</details>}{((role === 'guest' && agreement.status === 'awaiting_guest') || (role === 'host' && agreement.status === 'awaiting_host')) && <button className="exp-action-primary" disabled={busy} onClick={acceptAgreement}>I acknowledge this version <ArrowRight size={17} /></button>}</div> : <div className="exp-empty"><FileText size={34} /><h3>No agreement shared yet.</h3><p>{role === 'guest' ? 'Your host can prepare the terms here. You’ll be able to review them before acknowledging.' : 'Add clear terms above so your guest can review them.'}</p></div>}</section>}
      {tab === 'reports' && <section className="exp-stay-section"><div className="exp-section-intro"><div><span className="exp-overline">KEEP A CLEAR RECORD</span><h2>Something needs<br />attention?</h2></div><p>Record the move-in or move-out condition, request a repair, or report damage. Photos and updates stay attached to this booking.</p></div><button className="exp-action-primary" onClick={() => setIssueOpen(v => !v)}><Plus size={18} /> New report</button>{issueOpen && <form className="exp-form-panel exp-issue-form" onSubmit={createIssue}><div className="exp-form-head"><h3>New report</h3><button type="button" onClick={() => setIssueOpen(false)} aria-label="Close report form"><X size={19} /></button></div><div className="exp-form-two"><label>Type<select value={issueForm.kind} onChange={e => setIssueForm({ ...issueForm, kind: e.target.value })}><option value="move_in">Move-in condition</option><option value="move_out">Move-out condition</option><option value="maintenance">Maintenance</option><option value="damage">Damage</option></select></label><label>Priority<select value={issueForm.severity} onChange={e => setIssueForm({ ...issueForm, severity: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="urgent">Urgent</option></select></label></div><div className="exp-form-two"><label>Title<input value={issueForm.title} onChange={e => setIssueForm({ ...issueForm, title: e.target.value })} minLength={3} maxLength={120} required placeholder="e.g. Kitchen tap leaking" /></label><label>Area<input value={issueForm.area} onChange={e => setIssueForm({ ...issueForm, area: e.target.value })} maxLength={80} placeholder="e.g. Kitchen" /></label></div><label>What happened?<textarea value={issueForm.description} onChange={e => setIssueForm({ ...issueForm, description: e.target.value })} minLength={10} maxLength={3000} required placeholder="Describe the condition or issue clearly…" /></label><ImagePicker photos={issueForm.photos} onChange={photos => setIssueForm({ ...issueForm, photos })} /><button className="exp-action-primary" disabled={busy}>Save report <ArrowRight size={17} /></button></form>}
        {issues.length === 0 ? <div className="exp-empty"><Shield size={34} /><h3>No reports on this stay.</h3><p>Use this space to keep a shared record if anything needs attention.</p></div> : <div className="exp-issue-list">{issues.map(issue => <article className="exp-issue" key={issue._id}><div className="exp-issue-top"><span className="exp-chip">{issueNames[issue.kind]}</span><span className={`exp-status exp-status-${issue.status}`}>{issue.status.replace('_', ' ')}</span></div><h3>{issue.title}</h3><p className="exp-issue-meta"><Clock size={15} />{date(issue.createdAt)}{issue.area && ` · ${issue.area}`} · {issue.severity} priority</p><p>{issue.description}</p>{issue.photos?.length > 0 && <div className="exp-issue-photos">{issue.photos.map((photo, i) => <a href={photo} target="_blank" rel="noreferrer" key={i}><img src={photo} alt={`${issue.title} evidence ${i + 1}`} /></a>)}</div>}{issue.hostResponse && <div className="exp-host-response"><strong>Host update</strong><p>{issue.hostResponse}</p></div>}{issue.updates?.length > 0 && <div className="exp-issue-timeline">{issue.updates.map((update, index) => <div key={update._id || index}><small>{update.authorId === issue.hostId ? 'Host' : 'Guest'} · {date(update.createdAt)}</small><p>{update.text}</p></div>)}</div>}<div className="exp-issue-reply"><input aria-label={`Add update to ${issue.title}`} value={replies[issue._id] || ''} onChange={e => setReplies({ ...replies, [issue._id]: e.target.value })} maxLength={2000} placeholder="Add an update to this report…" /><button disabled={busy || !replies[issue._id]?.trim()} onClick={() => replyToIssue(issue)}>Send</button></div>{role === 'host' && <div className="exp-issue-actions"><textarea aria-label={`Response to ${issue.title}`} placeholder="Add an update for the guest…" value={responses[issue._id] ?? issue.hostResponse ?? ''} onChange={e => setResponses({ ...responses, [issue._id]: e.target.value })} maxLength={2000} /><div><button disabled={busy} onClick={() => updateIssue(issue, 'in_progress')}>In progress</button><button disabled={busy} onClick={() => updateIssue(issue, 'resolved')}>Mark resolved</button></div></div>}</article>)}</div>}</section>}
    </div>
  </div>;
}
