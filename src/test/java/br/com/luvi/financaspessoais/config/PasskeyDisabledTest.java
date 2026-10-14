package br.com.luvi.financaspessoais.config;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringJUnitConfig(PasskeyFlowTest.Config.class)
@WebAppConfiguration
@TestPropertySource(properties="luvi.passkeys.enabled=false")
class PasskeyDisabledTest {
 @Autowired WebApplicationContext context;
 @Test void disabledFeatureKeepsPasswordLogin()throws Exception{
  var mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  mvc.perform(post("/webauthn/register/options").with(user("tester")).with(csrf())).andExpect(status().isNotFound());
  mvc.perform(post("/login").with(csrf()).param("username","tester").param("password","test-password"))
   .andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("/"));
 }
}
