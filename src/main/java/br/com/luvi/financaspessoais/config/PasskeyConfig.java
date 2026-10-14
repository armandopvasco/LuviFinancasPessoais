package br.com.luvi.financaspessoais.config;

import java.net.URI;
import java.time.Duration;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.security.web.webauthn.api.*;
import org.springframework.security.web.webauthn.management.*;

@Configuration
@ConditionalOnProperty(name = "luvi.passkeys.enabled", havingValue = "true")
public class PasskeyConfig {
    @Bean
    JdbcPublicKeyCredentialUserEntityRepository passkeyUsers(JdbcOperations jdbc) {
        return new JdbcPublicKeyCredentialUserEntityRepository(jdbc);
    }

    @Bean
    JdbcUserCredentialRepository passkeyCredentials(JdbcOperations jdbc) {
        return new JdbcUserCredentialRepository(jdbc);
    }

    @Bean
    WebAuthnRelyingPartyOperations passkeyOperations(
            JdbcPublicKeyCredentialUserEntityRepository users,
            JdbcUserCredentialRepository credentials,
            @Value("${luvi.passkeys.rp-id:}") String rpId,
            @Value("${luvi.passkeys.origin:}") String origin) {
        URI uri = URI.create(origin);
        if (rpId.isBlank()
                || uri.getHost() == null
                || !uri.getHost().equals(rpId)
                || uri.getRawQuery() != null
                || uri.getRawFragment() != null
                || uri.getUserInfo() != null
                || (uri.getPath() != null && !uri.getPath().isEmpty())
                || !("https".equals(uri.getScheme())
                        || ("localhost".equals(rpId) && "http".equals(uri.getScheme())))) {
            throw new IllegalArgumentException(
                    "Passkeys: configure RP_ID como o host exato e ORIGIN como https://host, sem barra final.");
        }
        var operations =
                new Webauthn4JRelyingPartyOperations(
                        users,
                        credentials,
                        PublicKeyCredentialRpEntity.builder()
                                .id(rpId)
                                .name("LUVI Finanças")
                                .build(),
                        Set.of(origin));
        operations.setCustomizeCreationOptions(
                options ->
                        options.timeout(Duration.ofSeconds(60))
                                .authenticatorSelection(
                                        AuthenticatorSelectionCriteria.builder()
                                                .authenticatorAttachment(
                                                        AuthenticatorAttachment.PLATFORM)
                                                .residentKey(ResidentKeyRequirement.REQUIRED)
                                                .userVerification(
                                                        UserVerificationRequirement.REQUIRED)
                                                .build()));
        operations.setCustomizeRequestOptions(
                options ->
                        options.timeout(Duration.ofSeconds(60))
                                .userVerification(UserVerificationRequirement.REQUIRED));
        return operations;
    }
}
