# bcrypt Workers probe

On 2026-11-09, the isolated probe used the application's bcryptjs password
service with cost 12 on the Cloudflare Workers Free plan. The probe has no
database access and requires a secret token to run.

The local Workers runtime returned the expected hash format, accepted the
correct password, and rejected an incorrect password. On the deployed Worker,
each operation initially succeeded. Cloudflare's invocation logs reported
486 ms CPU for hashing and 684 ms CPU for the successful comparison.
Subsequent requests returned HTTP 503; an invocation log recorded
`exceededCpu` at 10 ms. This small sample demonstrates that the operations
cannot be relied on under the Free plan's 10 ms CPU limit.

After testing, the probe token was removed and the endpoint returned 404.
The deployed Worker is the disabled probe, not the application. The probe
configuration targets the real `message-board-auth` Worker, so deploying it
again would replace that Worker's current code.
