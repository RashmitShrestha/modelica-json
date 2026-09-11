within evalAndArrays;

block Threepeat_Unit "The sub sequence that Threepeat instantiates three times"

  parameter Real inpVal "Input value, different per instance";
  parameter Real derivVal = inpVal + 1 "Derived value, different per instance";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "Input signal";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "Output signal";

  Buildings.Controls.OBC.CDL.Reals.MultiplyByParameter multer(
    final k=inpVal) "Gain of this instance";
  Buildings.Controls.OBC.CDL.Reals.AddParameter adder(
    final p=derivVal) "Offset of this instance";

equation
  connect(u, multer.u);
  connect(multer.y, adder.u);
  connect(adder.y, y);

end Threepeat_Unit;
