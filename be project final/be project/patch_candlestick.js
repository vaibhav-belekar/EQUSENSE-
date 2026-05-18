const fs = require('fs');
const file = 'frontend/src/components/CandlestickChart.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add deduplication logic to formatData
content = content.replace(
  /\.sort\(\(a, b\) => a\.time - b\.time\)/,
  `.sort((a, b) => a.time - b.time)\n        .filter((item, index, array) => index === 0 || item.time !== array[index - 1].time)`
);

fs.writeFileSync(file, content);
