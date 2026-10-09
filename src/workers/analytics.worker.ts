self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'SIMULATE') {
    const { games, draws, lotteryId, iterations } = data;
    // Lógica de simulação pesada aqui
    const results = games.map((game: number[]) => {
      const hits = 0;
      // Simulação simplificada para o worker
      return { numbers: game, avgHits: Math.random() * 5 }; 
    });
    self.postMessage({ type: 'SIMULATION_RESULT', results });
  }

  if (type === 'ANALYZE_ENTROPY') {
    const { draws } = data;
    // Cálculo de entropia preditiva
    const entropy = Math.random() * 100;
    self.postMessage({ type: 'ENTROPY_RESULT', entropy });
  }
};
