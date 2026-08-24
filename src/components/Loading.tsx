/**
 * The house loading state: a short bar chart that reads as a place setting
 * rather than a spinner, under a line of italic serif.
 */
export default function Loading({ message }: { message: string }) {
  const bars = [14, 26, 34, 20, 10];

  return (
    <div className="flex flex-col items-center justify-center py-28 gap-6">
      <div className="flex items-end gap-1.5 h-[34px]">
        {bars.map((height, index) => (
          <span
            key={index}
            className={`w-1 animate-pulse ${index === 2 ? 'bg-sage' : index < 2 ? 'bg-terracotta' : 'bg-sage/35'}`}
            style={{ height, animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>
      <p className="font-serif italic text-xl text-earth/55">{message}</p>
    </div>
  );
}
