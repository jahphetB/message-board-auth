# Session cleanup Worker probe

The probe uses a transaction-local temporary `session` table containing 52
expired rows, one protected current session, and one unexpired session. The
cleanup request deleted 50 rows and left the protected and unexpired rows.
The transaction rolled back, so no real sessions were changed.

On 2026-11-11, six requests to the deployed Workers Free probe all returned
HTTP 200. Cloudflare invocation logs recorded:

| Request | Worker CPU | Wall time |
| --- | ---: | ---: |
| Baseline | 20 ms | 1764 ms |
| Cleanup | 9 ms | 205 ms |
| Baseline | 8 ms | 207 ms |
| Cleanup | 9 ms | 196 ms |
| Baseline | 11 ms | 143 ms |
| Cleanup | 10 ms | 191 ms |

The baseline performed the same connection and temporary-table setup but did
not run cleanup. This is a small synthetic sample, not a measurement of the
complete app request. The cleanup samples leave little margin under the Free
plan's 10 ms CPU limit, and two baselines exceeded it despite succeeding.
Cloudflare can allow occasional over-limit requests, so these results do not
guarantee reliability under that limit.

After testing, the probe token was removed and the endpoint returned 404. The
deployed Worker contains the disabled probe, not the application. This probe
configuration targets `message-board-auth` and deploying it replaces that
Worker's code.
