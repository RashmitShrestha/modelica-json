within evalAndArrays;

block CondComps "Components kept or removed based on evaluated expressions"

  parameter Integer nZon = 1 "# of zones";
  parameter Boolean conditionalVal = true "expected to be true";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "Measured signal";

  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "Control signal";


  Buildings.Controls.OBC.CDL.Reals.MultiplyByParameter multKeep(
    final k=nZon) if conditionalVal "kept";
  Buildings.Controls.OBC.CDL.Reals.MultiplyByParameter multDel(
    final k=0) if not conditionalVal "removed";


equation
connect(u, multKeep.u);
connect(multKeep.y, multDel.u);
connect(multDel.y, y);
connect(multKeep.y, y);


end CondComps;
