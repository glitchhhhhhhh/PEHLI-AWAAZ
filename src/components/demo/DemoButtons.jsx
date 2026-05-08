

export default function DemoButtons({ onDemo }) {
  const demos = [
    { id: 'skeptical_trader', label: 'Broker Objection' },
    { id: 'busy_mfd', label: 'Call Later' },
    { id: 'eager_beginner', label: 'High Intent' },
  ];

  return (
    <div className="flex gap-2">
      {demos.map((d) => (
        <button
          key={d.id}
          onClick={() => onDemo(d.id)}
          className="flex-1 py-2 px-3 rounded-lg bg-white/05 border border-white/05 text-[10px] text-white/40 hover:bg-white/10 hover:text-white/60 transition-all uppercase tracking-wider font-medium cursor-pointer"
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
