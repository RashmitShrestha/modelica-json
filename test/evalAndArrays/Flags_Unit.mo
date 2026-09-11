within evalAndArrays;

block Flags_Unit "The sub sequence all four flag combination tests instantiate"

  parameter Integer nZon "# of zones, propagated from the parent";
  parameter Boolean status "Flag, propagated from the parent";
  parameter Real conditional = if status then nZon else 0
    "Derived inside the sub sequence, expect 3";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "Input signal";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "Output signal";

  Buildings.Controls.OBC.CDL.Reals.AddParameter adder(
    final p=conditional) "The one elementary block of the sub sequence";

equation
  connect(u, adder.u);
  connect(adder.y, y);

end Flags_Unit;
