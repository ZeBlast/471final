/**
 * USPS / IPEDS-style jurisdiction codes → full display names.
 * Used by Learn (scatter), Explore (map), and Decide (search / compare).
 */
(function (g) {
  const pairs =
    "AL:Alabama,AK:Alaska,AZ:Arizona,AR:Arkansas,CA:California,CO:Colorado,CT:Connecticut,DE:Delaware,DC:District of Columbia,FL:Florida,GA:Georgia,HI:Hawaii,ID:Idaho,IL:Illinois,IN:Indiana,IA:Iowa,KS:Kansas,KY:Kentucky,LA:Louisiana,ME:Maine,MD:Maryland,MA:Massachusetts,MI:Michigan,MN:Minnesota,MS:Mississippi,MO:Missouri,MT:Montana,NE:Nebraska,NV:Nevada,NH:New Hampshire,NJ:New Jersey,NM:New Mexico,NY:New York,NC:North Carolina,ND:North Dakota,OH:Ohio,OK:Oklahoma,OR:Oregon,PA:Pennsylvania,RI:Rhode Island,SC:South Carolina,SD:South Dakota,TN:Tennessee,TX:Texas,UT:Utah,VT:Vermont,VA:Virginia,WA:Washington,WV:West Virginia,WI:Wisconsin,WY:Wyoming," +
    "PR:Puerto Rico,VI:U.S. Virgin Islands,GU:Guam,AS:American Samoa,MP:Northern Mariana Islands,UM:U.S. Minor Outlying Islands," +
    "PW:Palau,FM:Federated States of Micronesia,MH:Marshall Islands," +
    "AE:U.S. Armed Forces Europe,AA:U.S. Armed Forces Americas,AP:U.S. Armed Forces Pacific";

  const US_STATE_ABBR_TO_NAME = Object.freeze(
    Object.fromEntries(
      pairs.split(",").map((pair) => {
        const [abbr, name] = pair.split(":");
        return [abbr, name];
      })
    )
  );

  /**
   * @param {string} abbr — two-letter code (e.g. STABBR)
   * @returns {string} e.g. "Maryland (MD)"; unknown codes still show the code.
   */
  function formatUsStateAbbrForDisplay(abbr) {
    if (abbr == null || abbr === "") return "";
    const key = String(abbr).trim();
    const full = US_STATE_ABBR_TO_NAME[key];
    if (full) return `${full} (${key})`;
    return `Jurisdiction (${key})`;
  }

  g.usStateNames = Object.freeze({
    US_STATE_ABBR_TO_NAME,
    formatUsStateAbbrForDisplay
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
