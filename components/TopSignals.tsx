<TopSignals
  signals={[
    {
      market: "Over 2",
      prediction: over2.prediction,
      confidence: over2.confidence,
      status: over2.valid ? "BUY" : "WAIT",
    },
    {
      market: "Under 7",
      prediction: under7.prediction,
      confidence: under7.confidence,
      status: under7.valid ? "BUY" : "WAIT",
    },
    {
      market: "Even",
      prediction: even.prediction,
      confidence: even.confidence,
      status: even.valid ? "BUY" : "WAIT",
    },
    {
      market: "Odd",
      prediction: odd.prediction,
      confidence: odd.confidence,
      status: odd.valid ? "BUY" : "WAIT",
    },
    {
      market: "Matches 5",
      prediction: matches.prediction,
      confidence: matches.confidence,
      status: matches.valid ? "BUY" : "WAIT",
    },
    {
      market: "Differs 5",
      prediction: differs.prediction,
      confidence: differs.confidence,
      status: differs.valid ? "BUY" : "WAIT",
    },
  ]}
/>
