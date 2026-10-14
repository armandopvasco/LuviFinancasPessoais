package br.com.luvi.financaspessoais.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.cbor.CBORFactory;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.web.webauthn.management.*;
import org.springframework.security.web.webauthn.api.*;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@SpringJUnitConfig(PasskeyFlowTest.Config.class)
@WebAppConfiguration
@TestPropertySource(properties="luvi.passkeys.enabled=true")
class PasskeyFlowTest {
    @Configuration @EnableWebSecurity @EnableWebMvc @Import(SecurityConfig.class)
    static class Config {
        @Bean UserDetailsService users(){return name -> User.withUsername(name).password(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("test-password")).roles("USER").build();}
        @Bean MapPublicKeyCredentialUserEntityRepository userEntities(){return new MapPublicKeyCredentialUserEntityRepository();}
        @Bean MapUserCredentialRepository credentials(){return new MapUserCredentialRepository();}
        @Bean WebAuthnRelyingPartyOperations operations(MapPublicKeyCredentialUserEntityRepository u,MapUserCredentialRepository c){
            var op=new Webauthn4JRelyingPartyOperations(u,c,PublicKeyCredentialRpEntity.builder().id("luvi.test").name("LUVI").build(),Set.of("https://luvi.test"));
            op.setCustomizeCreationOptions(o->o.authenticatorSelection(AuthenticatorSelectionCriteria.builder().authenticatorAttachment(AuthenticatorAttachment.PLATFORM).residentKey(ResidentKeyRequirement.REQUIRED).userVerification(UserVerificationRequirement.REQUIRED).build()));
            op.setCustomizeRequestOptions(o->o.userVerification(UserVerificationRequirement.REQUIRED));return op;
        }
        @Bean TestController controller(){return new TestController();}
    }
    @RestController static class TestController {@GetMapping("/private") String secured(){return "ok";}}
    @Autowired WebApplicationContext context;
    MockMvc mvc; ObjectMapper json=new ObjectMapper(),cbor=new ObjectMapper(new CBORFactory());
    @BeforeEach void setup(){mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();}
    String b64(byte[] value){return Base64.getUrlEncoder().withoutPadding().encodeToString(value);}
    byte[] hash(byte[] value)throws Exception{return MessageDigest.getInstance("SHA-256").digest(value);}
    byte[] client(String type,String challenge,String origin)throws Exception{return json.writeValueAsBytes(Map.of("type",type,"challenge",challenge,"origin",origin,"crossOrigin",false));}
    byte[] coord(java.math.BigInteger n){byte[] in=n.toByteArray(),out=new byte[32];System.arraycopy(in,Math.max(0,in.length-32),out,Math.max(0,32-in.length),Math.min(32,in.length));return out;}
    record Key(byte[] id,KeyPair pair,String userHandle){}
    Key register()throws Exception{
        var session=new MockHttpSession();
        var response=mvc.perform(post("/webauthn/register/options").session(session).with(user("tester")).with(csrf())).andExpect(status().isOk()).andReturn();
        var options=json.readTree(response.getResponse().getContentAsString());
        assertEquals("required",options.path("authenticatorSelection").path("userVerification").asText());
        var generator=KeyPairGenerator.getInstance("EC");generator.initialize(new ECGenParameterSpec("secp256r1"));var pair=generator.generateKeyPair();
        var pub=(ECPublicKey)pair.getPublic();byte[] id=new byte[32];new SecureRandom().nextBytes(id);
        Map<Integer,Object> cose=new LinkedHashMap<>();cose.put(1,2);cose.put(3,-7);cose.put(-1,1);cose.put(-2,coord(pub.getW().getAffineX()));cose.put(-3,coord(pub.getW().getAffineY()));
        byte[] key=cbor.writeValueAsBytes(cose);
        byte[] auth=ByteBuffer.allocate(32+1+4+16+2+id.length+key.length).put(hash("luvi.test".getBytes(StandardCharsets.UTF_8))).put((byte)0x45).putInt(0).put(new byte[16]).putShort((short)id.length).put(id).put(key).array();
        var att=cbor.writeValueAsBytes(Map.of("fmt","none","attStmt",Map.of(),"authData",auth));
        var credential=Map.of("id",b64(id),"rawId",b64(id),"type","public-key","clientExtensionResults",Map.of(),"response",Map.of("clientDataJSON",b64(client("webauthn.create",options.get("challenge").asText(),"https://luvi.test")),"attestationObject",b64(att),"transports",List.of("internal")));
        var payload=json.writeValueAsBytes(Map.of("publicKey",Map.of("credential",credential,"label","test")));
        mvc.perform(post("/webauthn/register").session(session).with(user("tester")).with(csrf()).contentType("application/json").content(payload))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        return new Key(id,pair,options.path("user").path("id").asText());
    }
    byte[] assertion(Key key,String challenge,String origin,boolean uv)throws Exception{
        byte[] data=client("webauthn.get",challenge,origin);
        byte[] auth=ByteBuffer.allocate(37).put(hash("luvi.test".getBytes(StandardCharsets.UTF_8))).put((byte)(uv?5:1)).putInt(1).array();
        var sign=Signature.getInstance("SHA256withECDSA");sign.initSign(key.pair.getPrivate());sign.update(auth);sign.update(hash(data));
        return json.writeValueAsBytes(Map.of("id",b64(key.id),"rawId",b64(key.id),"type","public-key","clientExtensionResults",Map.of(),"response",Map.of("clientDataJSON",b64(data),"authenticatorData",b64(auth),"signature",b64(sign.sign()),"userHandle",key.userHandle)));
    }
    @Test void validCredentialAuthenticatesAndRotatesSession()throws Exception{
        var key=register();var session=new MockHttpSession();var oldId=session.getId();
        var options=mvc.perform(post("/webauthn/authenticate/options").session(session).with(csrf())).andExpect(status().isOk()).andReturn();
        var body=assertion(key,json.readTree(options.getResponse().getContentAsString()).get("challenge").asText(),"https://luvi.test",true);
        mvc.perform(post("/login/webauthn").session(session).with(csrf()).contentType("application/json").content(body)).andExpect(status().isOk());
        assertNotEquals(oldId,session.getId());mvc.perform(get("/private").session(session)).andExpect(status().isOk());
        mvc.perform(post("/login/webauthn").session(new MockHttpSession()).with(csrf()).contentType("application/json").content(body)).andExpect(status().isUnauthorized());
    }
    @Test void wrongOriginAndMissingVerificationRejected()throws Exception{
        var key=register();for(var origin:List.of("https://evil.test","https://luvi.test")){
            var session=new MockHttpSession();var res=mvc.perform(post("/webauthn/authenticate/options").session(session).with(csrf())).andReturn();
            var challenge=json.readTree(res.getResponse().getContentAsString()).get("challenge").asText();
            mvc.perform(post("/login/webauthn").session(session).with(csrf()).contentType("application/json").content(assertion(key,challenge,origin,!origin.equals("https://luvi.test")))).andExpect(status().isUnauthorized());
        }
    }
    @Test void csrfAndAuthenticatedRegistrationRequired()throws Exception{
        mvc.perform(post("/webauthn/authenticate/options")).andExpect(status().isForbidden());
        mvc.perform(post("/webauthn/register/options").with(csrf())).andExpect(status().isBadRequest());
        mvc.perform(post("/webauthn/register/options").with(user("tester"))).andExpect(status().isForbidden());
        mvc.perform(post("/login/webauthn").with(csrf()).contentType("application/json").content("{}")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/webauthn/register/another-users-key").with(user("tester")).with(csrf())).andExpect(status().isForbidden());
    }
}
