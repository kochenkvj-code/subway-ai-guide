# Phase 3e — entry-station default for items left on a train

V2 passes the common station's Korean name, line and translated labels into
TrainLostFinder, and keys the instance by entry station code and visit. The
initial alighting station is no longer hard-coded to Jongno 5-ga. The local
alighting-station/line picker remains available and does not change the app's
QR/base station. Re-entering from home restores the base-station default.

Existing alighting station → neighbors/direction → live diagram/candidates
propagation is retained. This phase does not replace its time-per-stop model,
ranking, graph edges, direction codes, train-number handling or report flow.
Searches are still triggered by choosing a direction and update when the time
changes. Changing conditions clears previous matches/selections; requests are
aborted/invalidated when conditions, active state or station instance change.
Old position snapshots cannot overwrite a different selection scope.

Legacy station-name/line query overrides no longer override validated entry
props. Unsupported topology keeps the actual station name and displays an
unavailable state; it never silently substitutes Jongno 5-ga.

## Existing data vocabulary and limits

The graph uses the older line-4 names Dangogae and Isu. Verified name aliases
map current Bulamsan and Chongshin Univ. to those existing graph keys, without
inventing edges. Arrival requests use the provider's current aliases and accept
matching old/current names only within the requested line. Display names stay
current, and line-7 Isu remains independent.

The current graph covers 288 of the 289 source-listed entry stations after
name normalization. Amsa History Park `2810` is not in the existing graph and
is explicitly unavailable. Some existing direction edges, including line-2
branches and the Eungam loop, lack verified live direction codes and retain
their unavailable warning. This phase does not fabricate these missing data.

## Verification

- Existing candidate tests plus alias/coverage/provider tests pass.
- Full build passes.
- Browser tests cover Jonggak line 1, Dongmyo line 6, Jongno 3-ga line 3,
  Seoul line 1, Bulamsan line 4 and Chongshin Univ. line 4. They check default
  station/line, correct neighbors, both available directions, actual diagram
  origin/next stop, candidates and wrong-direction rejection, time-change
  refetch/reset, manual station changes, home reset, four languages at
  320/390 px, ignored URL line overrides and unsupported-station no-fallback.
- The browser uses explicit provider fixtures; live provider availability
  remains a separate deployment check.
- Direct live checks in an isolated deployment on 2026-11-02 returned line-6
  positions and Dongmyo line-6 evidence, plus valid line-4 evidence for
  Bulamsan and Chongshin Univ. using their current provider names.

Deploy under the existing operating `/v2`. Other station menu adapters, root
V1, AI prompts, statistics and feedback storage are unchanged.
