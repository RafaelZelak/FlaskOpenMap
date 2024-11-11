import ListEnterprise
import ListLead

def run_all():
    print("Buscando lista de empresas...")
    all_companies = ListEnterprise.get_companies()
    print(f"Total de empresas retornadas: {len(all_companies)}\n")

    print("Buscando lista de leads...")
    ListLead.get_crm_lead_list()
    print("Busca de leads concluída.")

# Executa as funções dos dois scripts
if __name__ == "__main__":
    run_all()
