import { useState } from 'react';

const STEPS = [
  {
    title: 'Welcome to AVTPP',
    body: "Pay tolls automatically from a digital wallet — no stopping, no cash. Here's a 30-second tour of how it works.",
  },
  {
    title: 'Your Dashboard',
    body: 'Your home base shows your wallet balance, recent toll payments, and quick links to everything.',
    where: 'Sidebar → Dashboard',
  },
  {
    title: 'Top Up Wallet',
    body: 'Add funds via mobile money (MTN, Airtel, or Zamtel). Toll fees are deducted from this balance automatically.',
    where: 'Sidebar → Top Up Wallet',
  },
  {
    title: 'My Vehicles',
    body: 'Register your vehicles with their licence plate, make, and class. The plate is what identifies you at a toll gate.',
    where: 'Sidebar → My Vehicles',
  },
  {
    title: 'Simulate Toll',
    body: 'Try an automated toll passage — choose a vehicle and gate, or scan a plate — and watch the fee deducted instantly.',
    where: 'Sidebar → Simulate Toll',
  },
  {
    title: 'Payment History',
    body: 'Review every toll transaction. Filter by date, vehicle, or gate, and export your records to CSV.',
    where: 'Sidebar → Payment History',
  },
  {
    title: 'Notifications & Settings',
    body: 'The bell (top-right) alerts you to deductions and low balance. In Settings you can add a profile picture, switch to dark mode, and change your password.',
    where: 'Sidebar → Settings',
  },
  {
    title: "You're all set!",
    body: 'Top up your wallet, add a vehicle, and you are ready to go. You can replay this tour anytime from Settings.',
  },
];

export default function OnboardingTour({ onClose }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;

  const next = () => (isLast ? onClose() : setI(i + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Platform tour">
      <div className="tour-card">
        <div className="tour-step-count">Step {i + 1} of {STEPS.length}</div>
        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-body">{step.body}</p>
        {step.where && <div className="tour-where">{step.where}</div>}

        <div className="tour-dots">
          {STEPS.map((_, k) => (
            <span key={k} className={`tour-dot ${k === i ? 'active' : ''}`} />
          ))}
        </div>

        <div className="tour-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Skip</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {i > 0 && <button className="btn btn-outline btn-sm" onClick={back}>Back</button>}
            <button className="btn btn-primary btn-sm" onClick={next}>{isLast ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
