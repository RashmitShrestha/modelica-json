within evalAndArrays;

block NestedHier_Level3 "Level 3 of 3, where the propagated value is used"

  parameter Real mult "From the level above";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "Measured signal";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "Control signal";

  Buildings.Controls.OBC.CDL.Reals.MultiplyByParameter topLevMult(
    final k=mult) "Expect k = 4/3";

equation
  connect(u, topLevMult.u);
  connect(topLevMult.y, y);

end NestedHier_Level3;
