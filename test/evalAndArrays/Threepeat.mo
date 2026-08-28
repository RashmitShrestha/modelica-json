within evalAndArrays;

block Threepeat "the same subsequence three times with a different value each"

  parameter Real inpOne = 1 "first instance value";
  parameter Real inpTwo = 2 "second instance value";
  parameter Real inpThr = 3 "third instance value";

  Buildings.Controls.OBC.CDL.Interfaces.RealInput u "input signal";
  Buildings.Controls.OBC.CDL.Interfaces.RealOutput y "sum of the three outputs";

  Threepeat_Unit uni1(final inpVal=inpOne) "expect inpVal = 1, derivVal = 2";
  Threepeat_Unit uni2(final inpVal=inpTwo) "expect inpVal = 2, derivVal = 3";
  Threepeat_Unit uni3(final inpVal=inpThr) "expect inpVal = 3, derivVal = 4";

  Buildings.Controls.OBC.CDL.Reals.MultiSum mulSum(
    final nin=3) "sum of the three instance outputs";

equation
  connect(u, uni1.u);
  connect(u, uni2.u);
  connect(u, uni3.u);
  connect(uni1.y, mulSum.u[1]);
  connect(uni2.y, mulSum.u[2]);
  connect(uni3.y, mulSum.u[3]);
  connect(mulSum.y, y);

end Threepeat;
