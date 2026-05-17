const birds = [
  { id: "sunny", delay: "-2s", duration: "24s", top: "9%", scale: 1 },
  { id: "mika", delay: "-10s", duration: "30s", top: "14%", scale: 0.82 },
  { id: "lulu", delay: "-17s", duration: "27s", top: "20%", scale: 0.68 },
  { id: "nori", delay: "-6s", duration: "34s", top: "26%", scale: 0.58 },
];

function PixelBirds() {
  return (
    <div className="pixel-birds" aria-hidden="true">
      {birds.map((bird) => (
        <span
          key={bird.id}
          className="pixel-bird"
          style={{
            "--bird-delay": bird.delay,
            "--bird-duration": bird.duration,
            "--bird-top": bird.top,
            "--bird-scale": bird.scale,
          }}
        >
          <span className="pixel-bird-wing pixel-bird-wing-left" />
          <span className="pixel-bird-body" />
          <span className="pixel-bird-wing pixel-bird-wing-right" />
        </span>
      ))}
    </div>
  );
}

export default PixelBirds;
