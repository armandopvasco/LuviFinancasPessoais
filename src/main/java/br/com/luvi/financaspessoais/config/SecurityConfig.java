package br.com.luvi.financaspessoais.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @org.springframework.beans.factory.annotation.Value("${luvi.passkeys.enabled:false}")
    private boolean passkeysEnabled;

    private void configurarPasskeys(HttpSecurity http) throws Exception {
        if (passkeysEnabled) {
            http.webAuthn(
                    webAuthn ->
                            webAuthn.rpName("LUVI Finanças").disableDefaultRegistrationPage(true));
        }
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @Profile("!google")
    SecurityFilterChain localSecurityFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(
                        a ->
                                a.requestMatchers(
                                                "/login",
                                                "/passkeys/support",
                                                "/webauthn/authenticate/options",
                                                "/login/webauthn",
                                                "/cadastro",
                                                "/css/**",
                                                "/js/**",
                                                "/images/**",
                                                "/img/**",
                                                "/icons/**",
                                                "/manifest.webmanifest",
                                                "/sw.js",
                                                "/favicon.ico")
                                        .permitAll()
                                        .requestMatchers(
                                                org.springframework.http.HttpMethod.DELETE,
                                                "/webauthn/register/**")
                                        .denyAll()
                                        .anyRequest()
                                        .authenticated())
                .formLogin(f -> f.loginPage("/login").defaultSuccessUrl("/", true).permitAll())
                .logout(l -> l.logoutSuccessUrl("/login?logout").permitAll())
                .csrf(c -> c.ignoringRequestMatchers("/api/**"));

        configurarPasskeys(http);
        var chain = http.build();
        for (var filter : chain.getFilters()) {
            if (filter
                    instanceof
                    org.springframework.security.web.webauthn.authentication
                                    .WebAuthnAuthenticationFilter
                            passkey) {
                var csrf =
                        new org.springframework.security.web.csrf.CsrfAuthenticationStrategy(
                                new org.springframework.security.web.csrf
                                        .HttpSessionCsrfTokenRepository());
                var fixation =
                        new org.springframework.security.web.authentication.session
                                .ChangeSessionIdAuthenticationStrategy();
                passkey.setSessionAuthenticationStrategy(
                        new org.springframework.security.web.authentication.session
                                .CompositeSessionAuthenticationStrategy(
                                java.util.List.of(fixation, csrf)));
            }
        }
        return chain;
    }

    @Bean
    @Profile("google")
    SecurityFilterChain googleSecurityFilterChain(
            HttpSecurity http, GoogleOidcUserService googleOidcUserService) throws Exception {
        http.authorizeHttpRequests(
                        a ->
                                a.requestMatchers(
                                                "/login",
                                                "/passkeys/support",
                                                "/webauthn/authenticate/options",
                                                "/login/webauthn",
                                                "/cadastro",
                                                "/oauth2/**",
                                                "/login/oauth2/**",
                                                "/css/**",
                                                "/js/**",
                                                "/images/**",
                                                "/img/**",
                                                "/icons/**",
                                                "/manifest.webmanifest",
                                                "/sw.js",
                                                "/favicon.ico")
                                        .permitAll()
                                        .requestMatchers(
                                                org.springframework.http.HttpMethod.DELETE,
                                                "/webauthn/register/**")
                                        .denyAll()
                                        .anyRequest()
                                        .authenticated())
                .formLogin(f -> f.loginPage("/login").defaultSuccessUrl("/", true).permitAll())
                .oauth2Login(
                        o ->
                                o.loginPage("/login")
                                        .userInfoEndpoint(
                                                u -> u.oidcUserService(googleOidcUserService))
                                        .defaultSuccessUrl("/", true)
                                        .failureUrl("/login?googleError"))
                .logout(l -> l.logoutSuccessUrl("/login?logout").permitAll())
                .csrf(c -> c.ignoringRequestMatchers("/api/**"));

        configurarPasskeys(http);
        var chain = http.build();
        for (var filter : chain.getFilters()) {
            if (filter
                    instanceof
                    org.springframework.security.web.webauthn.authentication
                                    .WebAuthnAuthenticationFilter
                            passkey) {
                var csrf =
                        new org.springframework.security.web.csrf.CsrfAuthenticationStrategy(
                                new org.springframework.security.web.csrf
                                        .HttpSessionCsrfTokenRepository());
                var fixation =
                        new org.springframework.security.web.authentication.session
                                .ChangeSessionIdAuthenticationStrategy();
                passkey.setSessionAuthenticationStrategy(
                        new org.springframework.security.web.authentication.session
                                .CompositeSessionAuthenticationStrategy(
                                java.util.List.of(fixation, csrf)));
            }
        }
        return chain;
    }
}
