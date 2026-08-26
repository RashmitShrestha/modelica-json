within evalAndArrays;

block ValueProp "BoundParams with the defaults removed, values come from the user"

  parameter Real input1 "user supplied, should equal 1";
  parameter Real input2 "user supplied, should equal 2";
  parameter Real derivedVal = input1 * input2 "derived from supplied value";

  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "output";

  Buildings.Controls.OBC.CDL.Reals.Sources.Constant con1(
    final k=input1) "carries input1 into the sequence";
  Buildings.Controls.OBC.CDL.Reals.Sources.Constant con2(
    final k=input2) "carries input2 into the sequence";

  Buildings.Controls.OBC.CDL.Reals.Add add2 "sums input1 and input2";

  Buildings.Controls.OBC.CDL.Reals.MultiplyByParameter multer(
    final k=derivedVal) "multiplies value by the derivedVal";

equation
  connect(con1.y, add2.u1);
  connect(con2.y, add2.u2);
  connect(add2.y, multer.u);
  connect(multer.y, y);

end ValueProp;
