# Battle Stage 5V - Sudden Death Intermission Backend

Backend-only patch.

Fixes:

- Tied battles remain in the same battle session.
- Tie transition does not enter cooldown/rematch.
- SUDDEN_DEATH `endsAt` is now `now + 40 seconds`.
- Mobile treats the first 10 seconds as a centered intermission countdown.
- Mobile treats the final 30 seconds as actual sudden death.
- Scores are preserved.
- Battle gifts are blocked during the first 10 second intermission.

Patch verification marker: BATTLE_STAGE5V_SUDDEN_DEATH_INTERMISSION_BACKEND
