# Snarl GoodBuilders Season 5 Application Draft

Updated 6 November 2026 for Samuel Onanike. Snarl has a live MVP at https://playsnarl.xyz and zero reported users and revenue. The new adventure and supply-shop frontend is ready for release; its SnarlGame contract is deployed on Celo, and Samuel has confirmed that the Cloudflare environment variable is configured. Publication of this frontend release has not yet been confirmed. This draft follows the supplied application field numbers. Season targets are proposals for Samuel and the GoodBuilders team to align on before submission.

Manager wallets, the funding wallet, Telegram, LinkedIn and private KYC details are intentionally left out. Previous GoodBuilders participation still needs confirmation. No attestations have been accepted on Samuel's behalf.

## Project information

**Project Name**

Snarl

**Description**

Snarl is a mobile web puzzle game on Celo where players untangle creatures and restore a connected world, with GoodDollar woven into daily play, optional supplies and a marketplace for player-made trails.

Players begin without a wallet. The completed adventure release adds 100 story levels across Quiet Pond, Reed Garden, Firefly Marsh, Moonlit Lake and Hidden Spring. Every five levels, a story moment and changing scenery show what their rescues accomplish. Endless expeditions follow the story, with new puzzle sequences, returning creatures and collection goals. Attempts remain unlimited, and three free hints return each day.

Eligible players can claim GoodDollar UBI through Snarl, then choose to spend G$ on hint bundles, Helping hands, Firefly vision or creator-made trails. Creators earn 90% of trail sales, with 10% supporting Snarl; supply sales go directly to the Snarl treasury. Players can also attach G$ to creature gifts. Any connected Celo wallet can record a completed puzzle and its starting crossings, moves and assistance flag, without a GoodDollar identity check. Scores are checked on the player's device and labelled player-reported.

The existing MVP is live, six contracts are deployed on Celo, and the source is public. The new game/shop contract has been checked against the local source; its frontend rollout is pending. We have zero reported users, sales and revenue. Our Season 5 goal is to learn whether a satisfying free adventure brings players back, and whether daily G$ income leads to voluntary purchases and creator earnings.

**Logo**

Existing square PNG: [Snarl icon](../public/icons/icon-512.png), 512 × 512 pixels. Suitable for the form's 1:1 image slot.

**Banner**

A 3:1 banner is still needed. Suggested content: the Snarl wordmark, a small pond with rescued creatures, and “Untangle a knot. Free a creature.”

**Website**

https://playsnarl.xyz

**Demo URL**

https://playsnarl.xyz

**GitHub Repos**

https://github.com/Onasachi/Snarl

**Smart Contracts**

All contracts below are on **Celo Mainnet, chain ID 42220**.

| Contract | Address | Purpose |
| --- | --- | --- |
| SnarlGame | `0x153ebE103cBB8E8C1fc4F3346f4504B6DeCDe071` | Any-wallet gameplay records, G$ supply purchases and public shop totals |
| SnarlTrails | `0xF55E8f7330B89659c7B835eA1043657A45393bdA` | G$ trail purchases, creator credits and protocol fees |
| SnarlGifts | `0x06Cf5deeB69D331DCdf37897BDc5337ba663Ed2B` | G$ attached to shareable creature gift links |
| SnarlNames | `0x608e899633239d46055838BB267Bbf13b067975b` | Names associated with GoodDollar identities |
| SnarlBoard | `0xa0478a7fAE7917D42B0D99E0f3a307cfe9C01342` | On-chain puzzle records for verified identities |
| SnarlWeekly | `0x4B901584C3AdD752a1bc25415D2a1997A7701612` | Optional weekly community pools and participation |

The application focuses on the adventure, optional G$ supplies and creator marketplace. SnarlGame records player-reported results; it does not prove unique players, prevent fabricated direct submissions or pay rewards for scores. Deployed weekly-pool support is not being presented as an active funded campaign. The shop treasury is an operating revenue destination, not a designation of the application funding wallet.

**Other Links**

- Public marketplace activity: https://playsnarl.xyz/?trail=0 — select **Activity**.
- Game and supply contract: https://celoscan.io/address/0x153ebE103cBB8E8C1fc4F3346f4504B6DeCDe071
- Marketplace contract: https://celoscan.io/address/0xF55E8f7330B89659c7B835eA1043657A45393bdA#code
- Community scores after the frontend release: https://playsnarl.xyz/?leaderboard=1
- Source and deployment details: https://github.com/Onasachi/Snarl/tree/master/contracts

## 1. Previous participation

**1.1. Have you participated in GoodBuilders before?**

**Confirm before submission.**

**1.2. Number of seasons**

Enter **0** if this is the first application; otherwise enter the actual number.

**1.3. Previous Karma updates**

Leave blank for a first application. Returning applicants should provide the actual update URL.

**1.4. What's the current state of your project today?**

Snarl has a deployed MVP at playsnarl.xyz with free guest play, creature collection, daily and weekly puzzles, GoodDollar identity checks and UBI claims, G$ gifting, and a creator marketplace with previews, paid access and a 90% creator / 10% Snarl split.

The new frontend release is complete locally: five chapters of twenty story levels, environmental restoration and story moments every five levels, endless expeditions, saved progression, optional G$ hints and boosts, and a leaderboard based on starting crossings and unassisted under-par finishes. It provides an explicit wallet transaction to record a rescue, with an option to keep playing and record later. It never requires GoodDollar verification to play, buy supplies or record gameplay. GoodDollar's own requirements continue to apply to UBI claims.

Six contracts are deployed on Celo. The new SnarlGame deployment matched the local runtime bytecode, G$ token, treasury and prices, and accepted a read-only simulation from an unverified wallet. Cloudflare configuration is reported complete; publication and production acceptance of the new frontend remain pending. Supply purchases are on-chain, while consumption and initial score checks are on the device. Supabase verification and cross-device inventory are planned, not implemented.

We are starting user acquisition. Reported users and revenue are zero. The recorded chain snapshots show no marketplace listings or sales and no SnarlGame runs or purchases. First priorities are to publish the release, onboard independent players and the first creators, and measure real return play alongside financial activity.

## 2. Maturity and usage today

| Field | Answer |
| --- | --- |
| **2.1. Project stage** | Select the closest available option to **Live MVP / early beta**. |
| **2.2. Lifetime users** | **0** |
| **2.3. Active users** | **0** |
| **2.4. Active users frequency** | **Weekly** |
| **2.5. GoodDollar-verified users today** | **0** |
| **2.6. On-chain transactions to date** | **0 end-user product transactions**; deployment, setup and test transactions are excluded. |
| **2.7. Revenue earned to date** | **0** |
| **2.8. Where do you track these numbers?** | **https://playsnarl.xyz/?trail=0** — select **Activity** for marketplace metrics. |

**2.9. Other relevant usage data**

Snarl is starting from a zero-user baseline. The existing marketplace Activity view reports sales, buyer wallets, repeat buyers, verified buyers and creators, G$ volume and revenue shares. SnarlGame adds recorded runs, participating wallets, supply purchases, buying wallets and supply-spending volume. Its public shop totals and community leaderboard are included in the pending frontend release. These counters do not independently measure active users, genuine puzzle completion or retention. Wallet counts are not assumed to represent unique people.

Behavioural analytics for first-puzzle completion, trail completion and weekly return cohorts are part of the first season milestone. There is no retention cohort to measure yet. Demo activity, development testing and local-fork transactions are excluded from the application figures.

## 3. Integration

**3.1. G$ integration status**

Select the closest available option to **Integrated and deployed on Celo mainnet**. UBI, gifting and trails are available in the existing MVP. The additional supply contract is deployed and checked; its frontend release is pending publication. Independent usage remains at the zero baseline.

**3.2. Integration type**

Select the available categories corresponding to:

- GoodDollar identity verification.
- Daily UBI claiming.
- G$ gameplay supplies, content payments and creator earnings.
- Peer-to-peer gifting.

**3.3. Describe your G$ integration and why it matters**

Snarl connects GoodDollar UBI to a free puzzle adventure: eligible players can claim G$, then voluntarily use it for hints, boosts, creator-made trails or creature gifts. Trail sales pay 90% to creators and 10% to Snarl, while the new supply contract sends purchases to the operating treasury, creating a measurable path from income to useful gameplay and creator earnings. The UBI, trail and gift flows are live; the deployed supply contract will become accessible through the pending frontend release.

## 4. What you will build

**4.1. Primary build goal**

Launch and measure Snarl's 100-level adventure and G$ economy, improve weekly return play, support 30 published trails and 10 earning creators, and publish a dashboard connecting retention, gameplay records, supply purchases and creator income.

**4.2. Build milestones**

These are proposed delivery dates for a 12-week plan beginning 9 November 2026. **31 January 2027 is a planning date, not a confirmed official season deadline.** Adjust dates with the GoodBuilders team if onboarding or the season calendar differs.

| Estimated completion | Deliverable and acceptance measure |
| --- | --- |
| **22 November 2026** | Publish and acceptance-test the adventure/shop release; instrument first-puzzle completion, meaningful weekly activity, assistance use and claim attribution; publish KPI definitions and the initial dashboard. Observe **20 independent pilot players**, support **5 verified creators**, and publish **5 playtested trails**. |
| **6 December 2026** | Improve onboarding from pilot feedback; complete **3 documented production wallet flows** covering an injected wallet, email login and a linked GoodDollar identity. Reach **10 published trails** and capture successful claim, rescue-record, supply purchase, trail purchase and creator-withdrawal transaction references for reporting. |
| **20 December 2026** | Ship creator guidance, clearer difficulty labels and trail discovery improvements; prototype Supabase result checks and wallet-authenticated inventory sync, keeping historical self-reported scores distinct. Reach **15 published trails** and run **2 creator feedback sessions**. Publish the first eligible weekly retention cohorts with their sample sizes. |
| **3 January 2027** | Make creature gifting easier to discover and explain. Run **1 themed creator trail release** and verify **5 independent gift recipients** can complete the gift flow. Reach **20 published trails**. |
| **17 January 2027** | Improve the **3 largest measured points of player drop-off**. Expand reporting to distinguish supply and trail purchases, repeat buyers, gross supply revenue, creator credits and withdrawals. Reach **25 published trails**. |
| **31 January 2027** | Reach **30 published trails** and **10 creators with a genuine sale**. Publish a season report covering retention, G$ income and use, supply revenue, creator earnings, fees, transaction evidence and the next authored content plan. |

**4.3. Ecosystem impact**

Snarl gives Celo and GoodDollar users a free adventure where G$ can buy useful help and content made by other community members. Public contracts and reporting will distinguish voluntary gameplay records, supply spending and creator income, showing whether G$ supports a product people return to beyond claims.

## 5. Your product in action

**5.1. Why do users come back each week, beyond rewards?**

Players have a journey to finish: rescue the first pond residents, reunite friends in the Reed Garden, restore the Firefly Marsh, discover the tangles' source in Moonlit Lake and restore the Hidden Spring. The new release turns progress into visible restoration and a story moment every five levels across 100 levels, followed by endless expeditions with returning creatures and collection goals.

Daily and weekly challenges, optional under-par goals and creator-made trails provide reasons to revisit familiar creatures and try new layouts. A community leaderboard gives starting crossing counts a purpose: ten points per crossing, plus twenty-five for an unassisted finish at or below par. These are player-reported scores with no payout attached. All attempts remain free and unlimited; G$ help is optional.

We will measure meaningful return play rather than treating a wallet connection, transaction or reward claim as evidence that someone enjoys the game.

**5.2. Target weekly retention by the end of the season**

**30%**

**5.3. Weekly retention today**

**0** as the application's early-stage numeric baseline. There is no user cohort yet, so this is **not a measured 0% retention rate**. If the form allows an unmeasured option, use it instead.

**5.4. How do users earn or receive G$ in your product?**

Eligible players can claim their daily GoodDollar UBI through Snarl. UBI comes from the GoodDollar protocol and does not depend on winning a puzzle. Creators can publish playtested trails and earn 90% of genuine purchases, then withdraw their credited G$. Players can also receive G$ attached to a creature gift.

For the season's income target, we will count distinct users with an attributable successful UBI claim through Snarl or a creator earnings withdrawal. Gift recipients will be reported separately, and one user will not be counted twice for using both income paths.

**5.5. Target users earning or receiving G$ by the end of the season**

**75**, including a goal of **10 creators earning from sales**. Claims and creator income will be reported separately as well as in the deduplicated total.

**5.6. Users earning G$ today**

**0**

**5.7. G$ used inside the product so far**

**0 G$**

**5.8. How do users spend, unlock or share G$ inside your product?**

The new supply shop offers five hints for 100 G$, three Helping hands for 150 G$, and three Firefly visions for 75 G$. Hints suggest a useful bead; a Helping hand moves one bead to reduce crossings; Firefly vision briefly reveals the creature's untangled shape. Supply payments go directly to Snarl's treasury. Purchases are recorded on-chain; usage is currently stored on the player's device.

Players can also buy three-puzzle trails after a free preview, unlocking the route, replay access and a pond palette on completion. Those sales credit 90% to the creator and 10% to Snarl. Players may attach G$ to a creature gift. GoodDollar verification is not required to buy supplies or trails; UBI claims and creator publishing retain their own requirements. Unlimited attempts and three free daily hints keep the adventure playable without spending.

**5.9. Target G$ used inside the product by the end of the season**

**20,000 G$** in genuine supply and trail purchases, with **200 purchases** and **30 repeat buyer wallets** as supporting targets. The proposed mix is **100 supply purchases totalling 10,000 G$** and **100 trail purchases totalling 10,000 G$**. One illustrative supply mix is 40 hint bundles, 20 Helping hand bundles and 40 Firefly vision bundles; the trail target assumes a 100 G$ average price. Actual demand will guide the mix.

Gift transfers are reported separately. UBI claims, transfers between team wallets, creator withdrawals and treasury transfers are not added again to purchase volume. Gameplay recording has a network fee but consumes no G$, so it contributes no G$ spending volume.

**5.10. What new ways will users be able to use G$ this season?**

The supply shop adds optional G$ help inside the adventure: hints, a bead-moving boost and a temporary view of the solved shape. We will publish this completed integration, measure purchases and subsequent use, and improve placement and explanation from player feedback. The free attempt model stays intact.

We will also expand themed creator trails and make G$ creature gifting easier to discover. Later work will add server-assisted result checking and inventory synchronization before considering reward-bearing competition; the current records are not an anti-cheat or rewards system.

## 6. How you will grow

**6.1. Primary growth goal**

Reach **150 weekly active players**, **30% weekly retention** and **200 genuine supply and trail purchases** by the end of the proposed season plan, through creator releases and three community pilots.

**6.2. Target communities or partners onboarded**

**3**

**6.3. What campaigns will drive this growth?**

1. **First creators:** recruit and support five GoodDollar-verified creators to publish the initial trails, then expand toward ten creators with sales. Run small playtesting sessions and feature trails based on quality and player feedback.
2. **Community pond weeks:** run pilots with three communities interested in casual games, Celo or GoodDollar. Each pilot includes guest onboarding, a shared puzzle session, a creator introduction and a follow-up return-play check. These are recruitment targets, not existing partnerships.
3. **Adventure and trail releases:** invite players back for story milestones and new creator routes, show optional G$ help at moments where it is useful, and let newcomers preview trails before deciding whether to buy. Measure return play and supply use after purchase, not just checkout conversion.
4. **Creator and player feedback:** observe where independent users stop, improve the onboarding and discovery flow, and share concrete progress in the GoodDollar channels where promotion is permitted.

Campaigns will focus on playable content and creator visibility. Grant-funded self-purchases or purchase rebates will not be used to manufacture sales.

**6.4. Growth milestones**

Targets below are cumulative except weekly active players, which are measured over the relevant seven-day period. Purchases and G$ volume combine supply and trail sales; their separate totals will also be reported.

| Estimated completion | Growth target |
| --- | --- |
| **22 November 2026** | **20 activated pilot players**, **5 verified creators**, **10 genuine purchases** and **1,000 G$** spent. |
| **6 December 2026** | **40 weekly active players**, **25 verified users**, **20 users receiving G$**, **30 purchases**, **3,000 G$** spent and **1 community pilot**. |
| **20 December 2026** | **70 weekly active players**, **45 verified users**, **35 users receiving G$**, **70 purchases**, **7,000 G$** spent and **2 community pilots**. |
| **3 January 2027** | **100 weekly active players**, **65 verified users**, **50 users receiving G$**, **120 purchases**, **12,000 G$** spent and **25% weekly retention** across eligible cohorts. |
| **17 January 2027** | **125 weekly active players**, **85 verified users**, **65 users receiving G$**, **160 purchases** and **16,000 G$** spent. |
| **31 January 2027** | **150 weekly active players**, **100 verified users**, **75 users receiving G$**, **200 purchases**, **20,000 G$** spent, **500 qualifying transactions**, **30 repeat buyer wallets**, **30% weekly retention** and **3 community pilots**. |

**6.5. Ecosystem impact**

We aim to bring casual players into the Celo ecosystem through a game they can try immediately, then give them a practical reason to use G$ and support creators. The season will produce visible evidence of which parts of that journey lead to repeat play, verified participation and economic activity.

**6.6. Sustainability plan**

Snarl has two proposed revenue paths: gross sales from optional G$ supplies and a 10% fee on creator trails. At the proposed 20,000 G$ spending mix, 10,000 G$ of supply sales plus 1,000 G$ of trail fees would give Snarl **11,000 G$ in gross revenue**, while trail creators would receive **9,000 G$ in credits**. This assumes 10,000 G$ in each category; it is a planning scenario, not measured revenue or a USD forecast. Revenue is not profit, and G$ prices do not imply that operating costs are covered.

Funding would support onboarding, analytics, content quality, creator tools, server-assisted validation and community pilots. Repeat play, voluntary repeat purchases and actual operating costs will determine whether demand can sustain development. Creator earnings come from sales rather than a promise of continuing grant subsidies.

If this field is only available to returning teams and this is a first application, leave it blank and use the same explanation in the additional comments if useful.

**6.7. Target GoodDollar-verified users**

**100** distinct GoodDollar identity roots participating in Snarl during the season, verified at the qualifying interaction. Current verification status will also be reported separately because verification can expire.

**6.8. Target active users**

**150 weekly active players**

**6.9. Target on-chain transactions**

**500** successful, attributable end-user actions: gameplay records, UBI claims through Snarl, supply purchases, trail publication and purchases, creator withdrawals, and gift actions. A planning split is 200 gameplay records, 200 purchases and 100 other qualifying actions; counts will be reported by category, not manufactured to match that mix. Count each transaction hash once. Exclude approvals, deployments, administrative setup, reverted transactions, team testing and local-fork activity. On-chain self-reported gameplay is reported separately from independently observed or server-checked completions.

**6.10. Target revenue**

If applicable and the field uses G$: **11,000 G$ in gross Snarl revenue**, comprising 10,000 G$ of supply sales and 1,000 G$ of trail fees under the proposed spending mix. The 9,000 G$ in creator credits is separate. If the form requires USD, agree a reporting conversion with the programme rather than entering the G$ amount as dollars. Leave this field blank if it is restricted to returning teams and this is a first application.

## 7. Team

**7.1. Primary contact name**

Samuel Onanike

**7.2. Primary contact role description**

Project lead for Snarl, responsible for product development, the Celo and GoodDollar integrations, player and creator onboarding, and programme progress reporting.

**7.4. Primary contact GitHub**

https://github.com/onasachi

**7.5. Additional teammates**

Leave blank unless additional teammates should be named. No team size has been assumed in this draft.

## 8. Additional

**8.1. Additional comments**

Snarl is applying at the beginning of its growth journey, with a working MVP, a deployed game/shop contract and a completed adventure release awaiting publication. Our hypothesis is that a free, evolving puzzle world brings people back, while G$ gives them a useful choice of help, creator content and gifts. We will report from a zero-usage baseline and distinguish real end-user activity from deployments and testing.

The most useful mentorship would cover retention measurement, reaching existing GoodDollar users, creator onboarding, pricing and wallet friction. We would also value guidance on adding server-assisted validation without slowing down play. Current scores are frontend-checked and player-reported; they do not trigger financial rewards. The proposed targets are a starting point for alignment with the GoodBuilders team.

**8.2. Where did you hear about GoodBuilders?**

Select the actual source from the form. This has not been supplied.

## Proposed Wallet Week

This is an example journey for the application and demo, not a claim about current player behaviour.

| Day | Reason to open Snarl | G$ role |
| --- | --- | --- |
| Monday | Rescue the first residents as a guest and start Quiet Pond. | No payment or wallet required to begin. |
| Tuesday | Continue the adventure and restore the first part of the pond. | An eligible player connects a wallet and claims GoodDollar UBI. |
| Wednesday | Try a harder puzzle and improve a previous solution. | Optionally buy a hint or boost bundle; attempts stay unlimited. |
| Thursday | Reach a story moment and reunite another friend. | Use a purchased boost or play unassisted; optionally record the result on Celo. Recording spends no G$. |
| Friday | Preview a creator's three-puzzle trail. | Choose whether to buy it with G$; 90% of the sale is credited to its creator. |
| Saturday | Finish the trail, apply its palette and share a creature. | Optionally attach G$ to a gift; creators can withdraw earned G$. |
| Sunday | Revisit a challenge and plan the next chapter or expedition. | Review G$ spending and remaining supplies; decide whether another purchase is useful. |


## Metric definitions for the season

- **Activated player:** a player who completes their first puzzle. Exclude team and automated test accounts.
- **Weekly active player:** a distinct player ID with a completed puzzle or trail in the last seven days. Page views, wallet connections and claim-only visits do not qualify. Anonymous device IDs are not proof of unique humans; report verified identities separately.
- **Weekly retention:** the share of a first-completion cohort that completes another puzzle in the following seven-day window. Publish cohort sizes; use the weighted result across the last four fully observed cohorts for the end-of-season target.
- **Verified user:** a distinct GoodDollar identity root verified at a qualifying Snarl interaction. Do not count linked wallets as additional verified people, and distinguish historical verification from current validity.
- **User receiving G$:** a distinct identity with a confirmed UBI claim attributed to Snarl or a creator earnings withdrawal. Deduplicate overlap; report protocol UBI and creator income separately. Creator sales and credits are also shown independently, including credits not yet withdrawn.
- **G$ used:** genuine supply and trail purchase amounts, reported separately and as a combined total. Do not add UBI claims, creator payouts or treasury transfers again. Gift volume is separate; recording a rescue adds no G$ volume.
- **Snarl gross revenue:** supply-sale proceeds transferred to the treasury plus the 10% trail-market fee. The other 90% of trail sales is creator revenue. Report credits, withdrawals and operating costs separately; gross revenue is not profit.
- **Repeat buyer wallet:** a wallet with at least two genuine purchases across supplies and trails. Deduplicate wallets across both contracts; count individual confirmed purchases once. The combined measure will be added to the season dashboard.
- **Gameplay records:** successful SnarlGame records, deduplicated by wallet and puzzle ID. These are self-reported metrics, not proof of unique people or independently verified completion. Report unassisted and assisted submissions separately.
- **Transactions:** qualifying successful transaction hashes attributable to user actions, counted once under the scope in field 6.9. Marketplace purchase totals alone are not the project's total transaction count.
- **Community onboarded:** a community whose organiser has agreed to a pilot, where at least ten non-team participants complete a first puzzle and a follow-up session or return-play review is held. The same player is not added again to the total user count for joining multiple pilots.

## Before submission

1. Publish the committed frontend release through GitLab/Cloudflare, verify that the configured SnarlGame address is in the production build, and complete owner-signed recording and supply-purchase acceptance flows. Then update the release-status wording above to match the live product.
2. Confirm first-time or returning participation and review the proposed dates, targets and contact-role description.
3. Prepare the 3:1 banner and upload the existing square logo. Record a short production demo showing adventure progression, restoration, an optional G$ supply purchase, rescue recording, daily claims and creator trails. Label any simulated segment explicitly.
4. Publish the first real, playtested trail with a currently verified creator and observe an independent user's full purchase/completion journey. The currently empty market limits what reviewers can try.
5. Complete manager and funding wallets, private KYC and contact fields directly in the official form. Samuel must personally review programme commitments, consent and all attestations.
6. Confirm the source-code attestation. The GitHub repository is publicly readable; no repository-wide licence was detected, while contract files declare MIT. Decide and add the intended project licence before describing the entire repository as open source.

## Evidence and programme references

- [Application template supplied by the applicant](../../../Downloads/goodbuilders-season-5-2026-10-29-application-template.md). Field names and requirements follow this template; dropdown labels should be matched to the live form.
- [GoodDollar Season 5 announcement, 27 October 2026](https://medium.com/gooddollar/goodbuilders-season-5-is-now-open-build-something-people-and-agents-come-back-to-1ba98aee0b6c). Applications are open, and kickoff is 9 November. The earlier “applications open soon” text is outdated. No hard application deadline or guaranteed late entry is established here.
- [Official application](https://flowstate.network/flow-councils/application/42220/0x889e0aadaa3f8b28a794ef70da147827c620a590).
- [Season details](https://ubi.gd/goodbuilders).
- [Live Snarl](https://playsnarl.xyz) and [public marketplace Activity](https://playsnarl.xyz/?trail=0). Activity was inspected on the production site, without a wallet connection or transaction.
- [Public repository](https://github.com/Onasachi/Snarl), [implementation record](GOODBUILDERS.md), and [contract deployment record](../contracts/DEPLOY.md).
- [Initial on-chain snapshot](GOODBUILDERS_SEASON_5_BASELINE.json): Celo block **82,059,830**, **6 November 2026 at 10:23:08 UTC**. All five contract addresses had bytecode. Marketplace listings, sales, buyers, verified buyers, creators, repeat buyers, volume and both revenue shares were zero; board and weekly player counts were also zero. The overall user baseline was supplied by Samuel; these on-chain counters do not independently measure guest users or retention.

- [SnarlGame deployment check](../contracts/DEPLOY.md): Celo block **82,064,989**, **6 November 2026**. Runtime bytecode, token, treasury, bundle prices and units matched this repository; an unverified wallet successfully simulated recording with `eth_call`. Runs, sales and G$ volume were zero. This check sent no transaction and is not an end-user activity claim. See the separate game deployment entry in the baseline file.
