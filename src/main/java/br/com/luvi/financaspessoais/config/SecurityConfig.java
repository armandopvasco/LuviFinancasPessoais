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

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @Profile("!google")
    SecurityFilterChain localSecurityFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(a -> a
                    .requestMatchers("/login", "/cadastro", "/css/**", "/js/**",
                            "/images/**", "/img/**", "/icons/**", "/manifest.webmanifest", "/sw.js", "/favicon.ico").permitAll()
                    .anyRequest().authenticated())
            .formLogin(f -> f
                    .loginPage("/login")
                    .defaultSuccessUrl("/", true)
                    .permitAll())
            .logout(l -> l
                    .logoutSuccessUrl("/login?logout")
                    .permitAll())
            .csrf(c -> c.ignoringRequestMatchers("/api/**"));

        return http.build();
    }

    @Bean
    @Profile("google")
    SecurityFilterChain googleSecurityFilterChain(HttpSecurity http,
                                                   GoogleOidcUserService googleOidcUserService) throws Exception {
        http.authorizeHttpRequests(a -> a
                    .requestMatchers("/login", "/cadastro",
                            "/oauth2/**", "/login/oauth2/**",
                            "/css/**", "/js/**", "/images/**", "/img/**", "/icons/**", "/manifest.webmanifest", "/sw.js", "/favicon.ico").permitAll()
                    .anyRequest().authenticated())
            .formLogin(f -> f
                    .loginPage("/login")
                    .defaultSuccessUrl("/", true)
                    .permitAll())
            .oauth2Login(o -> o
                    .loginPage("/login")
                    .userInfoEndpoint(u -> u.oidcUserService(googleOidcUserService))
                    .defaultSuccessUrl("/", true)
                    .failureUrl("/login?googleError"))
            .logout(l -> l
                    .logoutSuccessUrl("/login?logout")
                    .permitAll())
            .csrf(c -> c.ignoringRequestMatchers("/api/**"));

        return http.build();
    }
}
