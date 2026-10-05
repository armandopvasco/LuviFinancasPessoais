package br.com.luvi.financaspessoais.conta.service;

import br.com.luvi.financaspessoais.conta.entity.*;
import br.com.luvi.financaspessoais.conta.repository.*;
import br.com.luvi.financaspessoais.grupo.repository.GrupoMembroRepository;
import br.com.luvi.financaspessoais.usuario.entity.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class ContaService {
    private final ContaFinanceiraRepository contas;
    private final ContaGrupoRepository vinculos;
    private final GrupoMembroRepository membros;
    public ContaService(ContaFinanceiraRepository c, ContaGrupoRepository v, GrupoMembroRepository m){contas=c;vinculos=v;membros=m;}
    public List<ContaFinanceira> acessiveis(Usuario u){
        List<Long> gids=membros.findByUsuario(u).stream().map(x->x.getGrupo().getId()).toList();
        if(gids.isEmpty()) return contas.findByProprietarioAndAtivaTrueOrderByNome(u);
        return contas.acessiveis(u.getId(),gids);
    }
    public List<ContaFinanceira> doGrupo(Long gid,Usuario u){
        exigirMembro(gid,u); Set<Long> ids=new HashSet<>();
        for(var v:vinculos.findByGrupoId(gid)) ids.add(v.getConta().getId());
        return acessiveis(u).stream().filter(c->ids.contains(c.getId())).toList();
    }
    public boolean podeAcessar(Long cid,Usuario u){return acessiveis(u).stream().anyMatch(c->c.getId().equals(cid));}
    public boolean ehProprietario(Long cid,Usuario u){return contas.findById(cid).map(c->c.getProprietario().getId().equals(u.getId())).orElse(false);}
    @Transactional public ContaFinanceira criar(String nome,String tipo,Usuario u){
        ContaFinanceira c=new ContaFinanceira(); c.setNome(nome.trim()); c.setTipo(tipo==null||tipo.isBlank()?"BANCO":tipo); c.setProprietario(u); return contas.save(c);
    }
    @Transactional public void compartilhar(Long cid,Long gid,Usuario u){
        if(!ehProprietario(cid,u)) throw new SecurityException("Somente o proprietário pode compartilhar a conta.");
        var m=membros.findByGrupoIdAndUsuarioId(gid,u.getId()).orElseThrow(()->new SecurityException("Você precisa ser membro do grupo para compartilhar sua conta."));
        if(!vinculos.existsByContaIdAndGrupoId(cid,gid)){ ContaGrupo x=new ContaGrupo(); x.setConta(contas.findById(cid).orElseThrow()); x.setGrupo(m.getGrupo()); vinculos.save(x); }
    }
    @Transactional public void descompartilhar(Long cid,Long gid,Usuario u){
        if(!ehProprietario(cid,u)) throw new SecurityException("Somente o proprietário pode remover o compartilhamento.");
        if(!membros.existsByGrupoIdAndUsuarioId(gid,u.getId())) throw new SecurityException("Acesso negado ao grupo.");
        vinculos.findByContaId(cid).stream().filter(x->x.getGrupo().getId().equals(gid)).forEach(vinculos::delete);
    }
    private void exigirMembro(Long gid,Usuario u){if(!membros.existsByGrupoIdAndUsuarioId(gid,u.getId()))throw new SecurityException("Acesso negado ao grupo.");}
}
