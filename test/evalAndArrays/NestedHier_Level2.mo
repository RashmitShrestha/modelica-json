within evalAndArrays;

block NestedHier_Level2 "level 2 of 3, declares no values of its own"

  parameter Integer nZon "from the level above";
  parameter Real mult "from the level above";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "input signal";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "output signal";

  NestedHier_Level3 lev3(
    final mult=mult/nZon) "Expect mult = 4/3";

equation
  connect(u, lev3.u);
  connect(lev3.y, y);

end NestedHier_Level2;
