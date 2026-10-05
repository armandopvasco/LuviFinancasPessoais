package br.com.luvi.financaspessoais.categoria.repository;
import br.com.luvi.financaspessoais.categoria.entity.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CategoriaRepository extends JpaRepository<Categoria,Long>{
 List<Categoria> findByGrupoIdOrderByNome(Long grupoId); List<Categoria> findByUsuarioIdOrderByNome(Long usuarioId);
 boolean existsByGrupoIdAndNomeIgnoreCase(Long grupoId,String nome); boolean existsByUsuarioIdAndNomeIgnoreCase(Long usuarioId,String nome);
}
