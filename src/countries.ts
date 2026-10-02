export interface Country {
  code: string; // ISO 3166-1 alpha-3, é o valor gravado no banco
  alpha2: string; // usado para o nome em português e para a bandeira
  name: string;
}

// Pares alpha-2:alpha-3
const ISO_CODES = 'AF:AFG,AL:ALB,DZ:DZA,AD:AND,AO:AGO,AG:ATG,AR:ARG,AM:ARM,AU:AUS,AT:AUT,AZ:AZE,BS:BHS,BH:BHR,BD:BGD,BB:BRB,BY:BLR,BE:BEL,BZ:BLZ,BJ:BEN,BT:BTN,BO:BOL,BA:BIH,BW:BWA,BR:BRA,BN:BRN,BG:BGR,BF:BFA,BI:BDI,CV:CPV,KH:KHM,CM:CMR,CA:CAN,CF:CAF,TD:TCD,CL:CHL,CN:CHN,CO:COL,KM:COM,CG:COG,CD:COD,CR:CRI,CI:CIV,HR:HRV,CU:CUB,CW:CUW,CY:CYP,CZ:CZE,DK:DNK,DJ:DJI,DM:DMA,DO:DOM,EC:ECU,EG:EGY,SV:SLV,GQ:GNQ,ER:ERI,EE:EST,SZ:SWZ,ET:ETH,FJ:FJI,FI:FIN,FR:FRA,GA:GAB,GM:GMB,GE:GEO,DE:DEU,GH:GHA,GR:GRC,GD:GRD,GT:GTM,GN:GIN,GW:GNB,GY:GUY,HT:HTI,HN:HND,HK:HKG,HU:HUN,IS:ISL,IN:IND,ID:IDN,IR:IRN,IQ:IRQ,IE:IRL,IL:ISR,IT:ITA,JM:JAM,JP:JPN,JO:JOR,KZ:KAZ,KE:KEN,KI:KIR,KP:PRK,KR:KOR,XK:XKX,KW:KWT,KG:KGZ,LA:LAO,LV:LVA,LB:LBN,LS:LSO,LR:LBR,LY:LBY,LI:LIE,LT:LTU,LU:LUX,MG:MDG,MW:MWI,MY:MYS,MV:MDV,ML:MLI,MT:MLT,MH:MHL,MR:MRT,MU:MUS,MX:MEX,FM:FSM,MD:MDA,MC:MCO,MN:MNG,ME:MNE,MA:MAR,MZ:MOZ,MM:MMR,NA:NAM,NR:NRU,NP:NPL,NL:NLD,NZ:NZL,NI:NIC,NE:NER,NG:NGA,MK:MKD,NO:NOR,OM:OMN,PK:PAK,PW:PLW,PS:PSE,PA:PAN,PG:PNG,PY:PRY,PE:PER,PH:PHL,PL:POL,PT:PRT,PR:PRI,QA:QAT,RO:ROU,RU:RUS,RW:RWA,KN:KNA,LC:LCA,VC:VCT,WS:WSM,SM:SMR,ST:STP,SA:SAU,SN:SEN,RS:SRB,SC:SYC,SL:SLE,SG:SGP,SK:SVK,SI:SVN,SB:SLB,SO:SOM,ZA:ZAF,SS:SSD,ES:ESP,LK:LKA,SD:SDN,SR:SUR,SE:SWE,CH:CHE,SY:SYR,TW:TWN,TJ:TJK,TZ:TZA,TH:THA,TL:TLS,TG:TGO,TO:TON,TT:TTO,TN:TUN,TR:TUR,TM:TKM,TV:TUV,UG:UGA,UA:UKR,AE:ARE,GB:GBR,US:USA,UY:URY,UZ:UZB,VU:VUT,VA:VAT,VE:VEN,VN:VNM,YE:YEM,ZM:ZMB,ZW:ZWE';

const regionNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

export const COUNTRIES: Country[] = ISO_CODES.split(',')
  .map(pair => {
    const [alpha2, code] = pair.split(':');
    return { code, alpha2, name: regionNames.of(alpha2) || code };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

const pick = (codes: string) => codes.split(',').map(code => COUNTRIES.find(c => c.code === code)!);

// Opções do formulário (COUNTRIES completo serve só para exibir códigos já gravados)
const SOUTH_AMERICA = pick('BRA,ARG,BOL,CHL,COL,ECU,GUY,PRY,PER,SUR,URY,VEN'); // Brasil primeiro
const EUROPE = pick('DEU,AUT,BEL,HRV,DNK,ESP,FRA,GRC,IRL,ITA,NOR,NLD,POL,PRT,GBR,SWE,CHE');

export const NATIONALITY_COUNTRIES = SOUTH_AMERICA;
export const SECOND_NATIONALITY_COUNTRIES = [...SOUTH_AMERICA, ...EUROPE, ...pick('USA')];

// Valores antigos (texto livre, ex.: "Brasileira") não são códigos e devolvem undefined
export const findCountry = (value?: string) =>
  value ? COUNTRIES.find(c => c.code === value.trim().toUpperCase()) : undefined;

export const flagUrl = (country: Country) => `https://flagcdn.com/${country.alpha2.toLowerCase()}.svg`;
