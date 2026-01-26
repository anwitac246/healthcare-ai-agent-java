package com.aethercare.backend.common.response;

import java.time.Instant;

public record ErrorResponse(
    int status,
    String message,
    Instant timestamp
) {}