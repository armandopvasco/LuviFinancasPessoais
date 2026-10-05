package br.com.luvi.financaspessoais.config;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String,String>> argumento(IllegalArgumentException e){return resposta(HttpStatus.BAD_REQUEST,e.getMessage());}
    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<Map<String,String>> estado(IllegalStateException e){return resposta(HttpStatus.CONFLICT,e.getMessage());}
    @ExceptionHandler(SecurityException.class)
    ResponseEntity<Map<String,String>> seguranca(SecurityException e){return resposta(HttpStatus.FORBIDDEN,e.getMessage());}
    private ResponseEntity<Map<String,String>> resposta(HttpStatus status,String msg){return ResponseEntity.status(status).body(Map.of("message",msg==null?"Operação não permitida.":msg));}
}
