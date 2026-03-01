import kalshiAccount from '../services/KalshiAccount';

(async () => {
    const positions = await kalshiAccount.getPositions();
    console.log(JSON.stringify(positions, null, 2));
})();
