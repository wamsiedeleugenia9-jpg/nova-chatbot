function effectiveBlueprintEntitlement(access, blueprint) {
  return access?.entitled === true && blueprint?.entitled === true;
}

module.exports = { effectiveBlueprintEntitlement };
