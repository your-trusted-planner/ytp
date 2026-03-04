/**
 * Nickname / Diminutive Table
 *
 * Maps common English nicknames to their canonical name.
 * Both directions: Bob→Robert AND Robert→Robert.
 */

const CANONICAL: Record<string, string> = {
  // Robert
  bob: 'robert', bobby: 'robert', rob: 'robert', robby: 'robert', robbie: 'robert', robert: 'robert', bert: 'robert',
  // William
  bill: 'william', billy: 'william', will: 'william', willy: 'william', willie: 'william', liam: 'william', william: 'william',
  // James
  jim: 'james', jimmy: 'james', jamie: 'james', james: 'james',
  // Michael
  mike: 'michael', mikey: 'michael', mick: 'michael', mickey: 'michael', michael: 'michael',
  // Richard
  rick: 'richard', ricky: 'richard', rich: 'richard', dick: 'richard', richard: 'richard',
  // John
  jack: 'john', johnny: 'john', john: 'john', jon: 'john',
  // Thomas
  tom: 'thomas', tommy: 'thomas', thomas: 'thomas',
  // Charles
  charlie: 'charles', chuck: 'charles', charles: 'charles', chas: 'charles',
  // David
  dave: 'david', davey: 'david', david: 'david',
  // Joseph
  joe: 'joseph', joey: 'joseph', joseph: 'joseph',
  // Daniel
  dan: 'daniel', danny: 'daniel', daniel: 'daniel',
  // Edward
  ed: 'edward', eddie: 'edward', ted: 'edward', teddy: 'edward', edward: 'edward', ned: 'edward',
  // Christopher
  chris: 'christopher', christopher: 'christopher',
  // Matthew
  matt: 'matthew', matty: 'matthew', matthew: 'matthew',
  // Andrew
  andy: 'andrew', drew: 'andrew', andrew: 'andrew',
  // Anthony
  tony: 'anthony', anthony: 'anthony',
  // Steven / Stephen
  steve: 'steven', stevie: 'steven', steven: 'steven', stephen: 'steven',
  // Benjamin
  ben: 'benjamin', benny: 'benjamin', benjamin: 'benjamin',
  // Alexander
  alex: 'alexander', al: 'alexander', alexander: 'alexander',
  // Nicholas
  nick: 'nicholas', nicky: 'nicholas', nicholas: 'nicholas',
  // Patrick
  pat: 'patrick', paddy: 'patrick', patrick: 'patrick',
  // Timothy
  tim: 'timothy', timmy: 'timothy', timothy: 'timothy',
  // Kenneth
  ken: 'kenneth', kenny: 'kenneth', kenneth: 'kenneth',
  // Gregory
  greg: 'gregory', gregory: 'gregory',
  // Samuel
  sam: 'samuel', sammy: 'samuel', samuel: 'samuel',
  // Lawrence
  larry: 'lawrence', lawrence: 'lawrence',
  // Raymond
  ray: 'raymond', raymond: 'raymond',
  // Gerald
  jerry: 'gerald', gerald: 'gerald',
  // Dennis
  denny: 'dennis', dennis: 'dennis',
  // Peter
  pete: 'peter', peter: 'peter',
  // Henry
  hank: 'henry', harry: 'henry', henry: 'henry',
  // Walter
  walt: 'walter', wally: 'walter', walter: 'walter',
  // Frederick
  fred: 'frederick', freddy: 'frederick', frederick: 'frederick',
  // Arthur
  art: 'arthur', artie: 'arthur', arthur: 'arthur',
  // Harold
  hal: 'harold', harold: 'harold',
  // Theodore
  theo: 'theodore', theodore: 'theodore',
  // Philip
  phil: 'philip', philip: 'philip',
  // Donald
  don: 'donald', donny: 'donald', donald: 'donald',
  // Ronald
  ron: 'ronald', ronny: 'ronald', ronald: 'ronald',
  // Douglas
  doug: 'douglas', douglas: 'douglas',
  // Nathan / Nathaniel
  nate: 'nathaniel', nathan: 'nathaniel', nathaniel: 'nathaniel',
  // Jonathan
  jonathan: 'jonathan',

  // === FEMALE NAMES ===
  // Elizabeth
  liz: 'elizabeth', lizzy: 'elizabeth', beth: 'elizabeth', betty: 'elizabeth', betsy: 'elizabeth',
  eliza: 'elizabeth', elizabeth: 'elizabeth',
  // Margaret
  maggie: 'margaret', meg: 'margaret', peggy: 'margaret', marge: 'margaret', margaret: 'margaret',
  margie: 'margaret',
  // Catherine / Katherine
  kate: 'katherine', kathy: 'katherine', cathy: 'katherine', katie: 'katherine',
  catherine: 'katherine', katherine: 'katherine', kat: 'katherine',
  // Jennifer
  jen: 'jennifer', jenny: 'jennifer', jennifer: 'jennifer',
  // Patricia
  patty: 'patricia', trish: 'patricia', patricia: 'patricia', tricia: 'patricia',
  // Barbara
  barb: 'barbara', barbie: 'barbara', barbara: 'barbara',
  // Dorothy
  dot: 'dorothy', dotty: 'dorothy', dorothy: 'dorothy',
  // Christine / Christina
  chris_f: 'christine', tina: 'christine', christine: 'christine', christina: 'christine',
  // Susan
  sue: 'susan', susie: 'susan', suzy: 'susan', susan: 'susan',
  // Rebecca
  becky: 'rebecca', becca: 'rebecca', rebecca: 'rebecca',
  // Victoria
  vicky: 'victoria', tori: 'victoria', victoria: 'victoria',
  // Deborah
  deb: 'deborah', debbie: 'deborah', deborah: 'deborah',
  // Jessica
  jess: 'jessica', jessie: 'jessica', jessica: 'jessica',
  // Nancy
  nan: 'nancy', nancy: 'nancy',
  // Stephanie
  steph: 'stephanie', stephanie: 'stephanie',
  // Samantha
  samantha: 'samantha',
  // Alexandra
  alexandra: 'alexandra',
  // Jacqueline
  jackie: 'jacqueline', jacqueline: 'jacqueline',
  // Josephine
  jo: 'josephine', josie: 'josephine', josephine: 'josephine',
  // Abigail
  abby: 'abigail', abbie: 'abigail', abigail: 'abigail',
  // Virginia
  ginny: 'virginia', virginia: 'virginia',
  // Amanda
  mandy: 'amanda', amanda: 'amanda',
  // Melissa
  missy: 'melissa', melissa: 'melissa',
  // Theresa / Teresa
  terry: 'theresa', theresa: 'theresa', teresa: 'theresa',
  // Carolyn / Caroline
  carrie: 'caroline', carol: 'caroline', caroline: 'caroline', carolyn: 'caroline',
  // Kathleen
  kathleen: 'kathleen',
  // Cynthia
  cindy: 'cynthia', cynthia: 'cynthia',
  // Sandra
  sandy: 'sandra', sandra: 'sandra',
  // Pamela
  pam: 'pamela', pamela: 'pamela',
  // Kimberly
  kim: 'kimberly', kimberly: 'kimberly',
}

/**
 * Get the canonical form of a name.
 * Returns the canonical name if it's a known nickname, otherwise returns the input unchanged.
 */
export function getCanonicalName(name: string): string {
  if (!name) return name
  const lower = name.toLowerCase().trim()
  return CANONICAL[lower] || lower
}

/**
 * Check if two names are nickname variants of each other.
 * Returns true if both names map to the same canonical form.
 */
export function areNicknameVariants(a: string, b: string): boolean {
  if (!a || !b) return false
  return getCanonicalName(a) === getCanonicalName(b)
}
