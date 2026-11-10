# pgcrypto Workers probe

The Neon database reported pgcrypto 1.4 available, and migration 002 enabled it.
On the deployed Cloudflare Workers Free plan, the request-scoped pg pool called
the same password service and cost-12 pgcrypto queries as the application code.

Hashing returned a bcrypt cost-12 hash. Correct and incorrect password checks
returned true and false, respectively. A 72-byte password hashed and verified;
a 74-byte password was rejected. Repeated requests returned HTTP 200.

Cloudflare invocation logs for one captured set reported:

| Operation | CPU time | Wall time |
| --- | ---: | ---: |
| Hash | 20 ms | 544 ms |
| Correct comparison | 24 ms | 439 ms |
| Incorrect comparison | 6 ms | 502 ms |
| Boundary checks (hash and comparison) | 8 ms | 716 ms |
| Hash, repeat | 7 ms | 498 ms |
| Correct comparison, repeat | 7 ms | 406 ms |

An earlier successful hash and comparison used 28 ms and 35 ms CPU. Several
measurements exceed the Free plan's documented 10 ms per-request limit despite
succeeding. This small sample cannot establish reliable Free-plan operation.

The temporary probe token was removed after the test; the endpoint returned
404. The database secret remains configured on the new Worker. The deployed
Worker contains the disabled probe, not the application. The probe configuration
targets `message-board-auth` and deploying it replaces that Worker's code.
