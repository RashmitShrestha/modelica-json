within evalAndArrays;

block NestedHier_Level2 "Level 2 of 3, declares no values of its own"

  parameter Integer nZon "From the level above";
  parameter Real mult "From the level above";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "Input signal";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "Output signal";

  NestedHier_Level3 lev3(
    final mult=mult/nZon) "Expect mult = 4/3";

equation
  connect(u, lev3.u);
  connect(lev3.y, y);

end NestedHier_Level2;
