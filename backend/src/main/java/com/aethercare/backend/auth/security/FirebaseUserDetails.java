package com.aethercare.backend.auth.security;

import com.aethercare.backend.user.model.UserRole;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class FirebaseUserDetails implements UserDetails {
    
    private final String firebaseUid;
    private final String email;
    private final String name;
    private final UserRole role;
    
    public FirebaseUserDetails(String firebaseUid, String email, String name, UserRole role) {
        this.firebaseUid = firebaseUid;
        this.email = email;
        this.name = name;
        this.role = role;
    }
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
    
    @Override
    public String getPassword() {
        return null; // Firebase handles authentication
    }
    
    @Override
    public String getUsername() {
        return email;
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    
    @Override
    public boolean isEnabled() {
        return true;
    }
    
    public String getFirebaseUid() {
        return firebaseUid;
    }
    
    public String getEmail() {
        return email;
    }
    
    public String getName() {
        return name;
    }
    
    public UserRole getRole() {
        return role;
    }
}