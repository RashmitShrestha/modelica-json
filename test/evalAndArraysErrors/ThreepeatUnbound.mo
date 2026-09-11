within evalAndArraysErrors;

block ThreepeatUnbound "Threepeat with the value of the first instance left unbound"

  parameter Real inpTwo = 2 "Second instance value";
  parameter Real inpThr = 3 "Third instance value";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "Input signal";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "Sum of the three outputs";

  Threepeat_Unit uni1 "Expect the supplied inpVal, or no files at all";
  Threepeat_Unit uni2(final inpVal=inpTwo) "Expect inpVal = 2, derivVal = 3";
  Threepeat_Unit uni3(final inpVal=inpThr) "Expect inpVal = 3, derivVal = 4";

  Buildings.Controls.OBC.CDL.Reals.MultiSum mulSum(
    final nin=3) "Sum of the three instance outputs";

equation
  connect(u, uni1.u);
  connect(u, uni2.u);
  connect(u, uni3.u);
  connect(uni1.y, mulSum.u[1]);
  connect(uni2.y, mulSum.u[2]);
  connect(uni3.y, mulSum.u[3]);
  connect(mulSum.y, y);

end ThreepeatUnbound;
