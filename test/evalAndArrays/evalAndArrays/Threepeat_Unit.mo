within evalAndArrays;

block Threepeat_Unit "the sub sequence that Threepeat instantiates three times"

  parameter Real inpVal "input value, different per instance";
  parameter Real derivVal = inpVal + 1 "derived value, different per instance";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "input signal";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "output signal";

  Buildings.Controls.OBC.CDL.Reals.MultiplyByParameter multer(
    final k=inpVal) "Gain of this instance";
  Buildings.Controls.OBC.CDL.Reals.AddParameter adder(
    final p=derivVal) "Offset of this instance";

equation
  connect(u, multer.u);
  connect(multer.y, adder.u);
  connect(adder.y, y);

end Threepeat_Unit;
