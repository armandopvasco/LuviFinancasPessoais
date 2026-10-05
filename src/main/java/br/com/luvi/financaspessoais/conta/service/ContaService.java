package br.com.luvi.financaspessoais.conta.service;

import br.com.luvi.financaspessoais.conta.entity.*;
import br.com.luvi.financaspessoais.conta.repository.*;
import br.com.luvi.financaspessoais.grupo.repository.GrupoMembroRepository;
import br.com.luvi.financaspessoais.lancamento.repository.LancamentoRepository;
import br.com.luvi.financaspessoais.transferencia.repository.TransferenciaRepository;
import br.com.luvi.financaspessoais.usuario.entity.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class ContaService {
    private final ContaFinanceiraRepository contas;
    private final ContaGrupoRepository vinculos;
    private final GrupoMembroRepository membros;
    private final LancamentoRepository lancamentos;
    private final TransferenciaRepository transferencias;

    public ContaService(ContaFinanceiraRepository contas, ContaGrupoRepository vinculos,
                        GrupoMembroRepository membros, LancamentoRepository lancamentos,
                        TransferenciaRepository transferencias) {
        this.contas=contas; this.vinculos=vinculos; this.membros=membros;
        this.lancamentos=lancamentos; this.transferencias=transferencias;
    }

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
        validar(nome,tipo); ContaFinanceira c=new ContaFinanceira(); c.setNome(nome.trim()); c.setTipo(tipo); c.setProprietario(u); return contas.save(c);
    }
    @Transactional public ContaFinanceira alterar(Long id,String nome,String tipo,Usuario u){
        validar(nome,tipo); ContaFinanceira c=contas.findById(id).orElseThrow(()->new IllegalArgumentException("Conta não encontrada."));
        if(!c.getProprietario().getId().equals(u.getId())) throw new SecurityException("Somente o proprietário pode alterar esta conta.");
        c.setNome(nome.trim()); c.setTipo(tipo); return c;
    }
    @Transactional public void excluir(Long id,Usuario u){
        ContaFinanceira c=contas.findById(id).orElseThrow(()->new IllegalArgumentException("Conta não encontrada."));
        if(!c.getProprietario().getId().equals(u.getId())) throw new SecurityException("Somente o proprietário pode excluir esta conta.");
        if(lancamentos.existsByContaId(id)) throw new IllegalStateException("Esta conta possui lançamentos e não pode ser excluída.");
        if(transferencias.existsByOrigemIdOrDestinoId(id,id)) throw new IllegalStateException("Esta conta possui transferências e não pode ser excluída.");
        vinculos.findByContaId(id).forEach(vinculos::delete);
        contas.delete(c);
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
    private void validar(String nome,String tipo){
        if(nome==null||nome.isBlank()) throw new IllegalArgumentException("Informe o nome da conta.");
        if(nome.trim().length()>120) throw new IllegalArgumentException("O nome da conta deve ter no máximo 120 caracteres.");
        if(tipo==null||!Set.of("BANCO","CARTEIRA","OUTROS").contains(tipo)) throw new IllegalArgumentException("Selecione um tipo de conta válido.");
    }
    private void exigirMembro(Long gid,Usuario u){if(!membros.existsByGrupoIdAndUsuarioId(gid,u.getId()))throw new SecurityException("Acesso negado ao grupo.");}
}
