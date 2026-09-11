within evalAndArrays;

block NestedHier "Level 1 of 3, the only level that declares values"

  parameter Integer nZon = 3 "# of zones";
  parameter Real multTop = 2 "Multiplier value for the top level";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "Input signal";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "Output signal";

  NestedHier_Level2 lev2(
    final nZon=nZon,
    final mult=multTop*2) "Expect nZon = 3, mult = 4";

equation
  connect(u, lev2.u);
  connect(lev2.y, y);

end NestedHier;
