package br.com.luvi.financaspessoais.config;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/passkeys")
public class PasskeyController {
    private final JdbcTemplate jdbc;
    private final boolean enabled;

    public PasskeyController(
            JdbcTemplate jdbc, @Value("${luvi.passkeys.enabled:false}") boolean enabled) {
        this.jdbc = jdbc;
        this.enabled = enabled;
    }

    @GetMapping("/support")
    public Map<String, Boolean> support() {
        return Map.of("enabled", enabled);
    }

    @GetMapping("/profile")
    @Transactional(readOnly = true)
    public Map<String, Object> profile(Authentication authentication) {
        if (!enabled) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        var credentials =
                jdbc.queryForList(
                        "SELECT c.credential_id FROM user_credentials c JOIN user_entities u "
                                + "ON u.id = c.user_entity_user_id WHERE u.name = ?",
                        String.class,
                        authentication.getName());
        return Map.of("username", authentication.getName(), "credentials", credentials);
    }

    @DeleteMapping("/credential")
    @Transactional
    public void remove(@RequestParam String id, Authentication authentication) {
        if (!enabled) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        jdbc.update(
                "DELETE FROM user_credentials WHERE credential_id = ? "
                        + "AND user_entity_user_id IN (SELECT id FROM user_entities WHERE name = ?)",
                id,
                authentication.getName());
    }
}
