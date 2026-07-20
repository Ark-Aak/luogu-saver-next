# Logging System Specification

## 1. Scope

This specification defines backend structured logging behavior implemented under `packages/backend`.

## 2. Logger Configuration

The backend logger SHALL use pino.

In non-production environments, log level SHALL be `debug` and the logger MAY use `pino-pretty` transport.

In production environments, log level SHALL be `info`.

## 3. Error Serialization

For a log object field named `err`, `error`, `cleanupError`, or `callbackError`, if the field value is an `Error` instance, the logger SHALL serialize at least these fields:

1. `type`.
2. `message`.
3. `stack`.

The serialized value SHALL NOT be an empty object when the input value is an `Error` instance.

These rules apply to all logger levels.

## 4. External Service Failure Logs

If an LLM provider request fails, the LLM adapter SHALL log a normalized failure `reason` instead of logging the raw `Error` object.

The normalized failure `reason` SHALL follow `task-queue.spec.md` failure reason normalization and have length at most 80 characters.

LLM provider failure logs SHALL NOT include raw HTTP response bodies, HTML error pages, LLM prompt text, article bodies, paste bodies, or embedding vectors.

After logging, the LLM adapter SHALL throw an `Error` whose message equals the normalized failure `reason`.
