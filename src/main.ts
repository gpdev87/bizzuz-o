import { URL_DADOS } from './config';
import { armazenamentoIndexedDB, baixarBase, iniciarDados } from './dados/repositorio';
import { montarApp } from './ui/app';
import './ui/estilo.css';

const raiz = document.getElementById('app')!;
let app: ReturnType<typeof montarApp> | undefined;

function iniciar(): void {
  void iniciarDados({
    armazenamento: armazenamentoIndexedDB(),
    baixar: () => baixarBase(URL_DADOS),
    agora: Date.now,
    aoAtualizar: (estado, mudou) => app?.atualizar(estado, mudou),
  }).then((estado) => {
    app = montarApp(raiz, estado, { tentarNovamente: iniciar });
  });
}

iniciar();
