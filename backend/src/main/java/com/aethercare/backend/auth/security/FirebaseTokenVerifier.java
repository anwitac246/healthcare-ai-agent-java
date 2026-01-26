package com.aethercare.backend.auth.security;

import com.aethercare.backend.common.exception.UnauthorizedException;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class FirebaseTokenVerifier {
    
    private static final Logger logger = LoggerFactory.getLogger(FirebaseTokenVerifier.class);
    
    public FirebaseToken verifyToken(String idToken) {
        try {
            return FirebaseAuth.getInstance().verifyIdToken(idToken);
        } catch (FirebaseAuthException e) {
            logger.error("Firebase token verification failed: {}", e.getMessage());
            throw new UnauthorizedException("Invalid or expired Firebase token", e);
        }
    }
}