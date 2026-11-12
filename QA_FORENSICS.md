# Forensics Judge Q&A Guide (QA_FORENSICS.md)

Prepare for judge questions on blockchain forensics, heuristics accuracy, formulas, and real-world limits.

---

### Q1: What makes you confident that an address is the final destination rather than just another hop?
**Answer:** "We evaluate unspent leaf status, exchange deposit signatures, and proportional taint. If an address holds a significant percentage of the tainted stash and either ceases spending (a leaf) or is a verified exchange deposit address terminating a peel chain, our confidence formula awards it maximum certainty."

### Q2: How does your peel chain detector prevent false positives on regular payments with change?
**Answer:** "A single payment with change has 1 input and 2 outputs, but a true peel chain requires a consecutive sequence of at least 3 hops where the large continuation output is repeatedly peeled in the exact same asymmetric ratio (<15% vs >=80%). Single payments never trigger this multi-hop threshold."

### Q3: What is the proportional taint model and why use it over FIFO or LIFO?
**Answer:** "Proportional taint divides tainted value across all outputs based on the exact ratio of tainted to clean inputs entering each transaction. Unlike FIFO or Haircut heuristics which make arbitrary assumptions about which coin left first, proportional propagation preserves mathematical conservation of mass and aligns with established academic forensic literature."

### Q4: How do you handle Bitcoin CoinJoins and mixing services?
**Answer:** "We flag them using our `MIXER_PATTERN` and `FAN_OUT`/`FAN_IN` detectors by identifying equal-value output distributions and high-entropy splits. While CoinJoins intentionally dilute deterministic links, our system tags the pattern, raises the cyber-risk score, and calculates the post-mix taint share across all recipient branches."

### Q5: What is the common-input ownership heuristic, and when does it fail?
**Answer:** "Common-input clustering assumes that all inputs signed in a single transaction belong to the same entity, unified via Union-Find. It fails on collaborative transactions like Wasabi CoinJoin or PayJoin; to mitigate this, we exclude multi-party equal-denomination transactions from automatic clustering."

### Q6: How do you distinguish between legitimate change and peel outputs?
**Answer:** "In a standard peel chain, the larger output is the change being passed along to the next hop, while the smaller output is the peeled payment or fee. If the large output is repeatedly spent into the same 1-in-2-out pattern, our engine tags the large edge as `PEEL_CONTINUATION` and the small edge as `PEEL`."

### Q7: What stops an attacker from tricking your graph with dusting or decoy transactions?
**Answer:** "Our security detector scans for dusting (under 10,000 satoshis spread to 10+ addresses) and decoy transactions (edges under 0.1% of max value). When detected, these adversarial edges penalize confidence (-0.20 penalty) and are isolated so they cannot distort end-receiver rankings."

### Q8: How is the composite Cyber-Risk score (0–100) calculated?
**Answer:** "It is a weighted sum of five key cyber-risk components: 30% mixer exposure, 30% OFAC sanction linkage, 20% ransomware association, 10% peel chain depth, and 10% adversarial deception signals. Each component is normalized between 0 and 1, producing an intuitive score from 0 to 100."

### Q9: Can this analysis be submitted directly as proof in a court of law?
**Answer:** "No, and we state this honestly. CryptoTrace produces forensic probabilities and investigative leads, not legal proof. Blockchain pseudonyms require off-chain subpoenas and KYC exchange data to establish legal identity."

### Q10: How fast is your graph construction and taint engine?
**Answer:** "Our core heuristics and proportional taint algorithms run in under 50 milliseconds in Python using NetworkX and Union-Find disjoint sets. Even on deep multi-hop graphs with thousands of edges, trace calculations are instantaneous."
